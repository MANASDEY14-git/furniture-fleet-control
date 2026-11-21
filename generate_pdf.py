import re
import html
import subprocess
import os

def parse_inline(text):
    # Escape HTML characters first
    text = html.escape(text)
    
    # Inline code: `code`
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    
    # Bold + Italic: ***text***
    text = re.sub(r'\*\*\*+(.*?)\*\*\*+', r'<strong><em>\1</em></strong>', text)
    
    # Bold: **text**
    text = re.sub(r'\*\*+(.*?)\*\*+', r'<strong>\1</strong>', text)
    
    # Italic: *text* (avoid matching list markers)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
    
    # Links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    
    # Status badges styling
    text = re.sub(r'\b(NON-COMPLIANT|CRITICAL|FAIL|FAILED)\b', r'<span class="badge badge-danger">\1</span>', text)
    text = re.sub(r'\b(COMPLIANT|PASS|PASSED|VICTORY CONFIRMED)\b', r'<span class="badge badge-success">\1</span>', text)
    text = re.sub(r'\b(WARNING|PARTIAL|MAJOR DEFICIT)\b', r'<span class="badge badge-warning">\1</span>', text)
    
    return text

def markdown_to_html(md_text):
    lines = md_text.splitlines()
    html_out = []
    
    in_code_block = False
    code_lang = ""
    code_lines = []
    
    in_table = False
    table_headers = []
    table_alignments = []
    table_rows = []
    
    in_list = False
    list_type = "ul"
    
    in_blockquote = False
    blockquote_lines = []
    
    def flush_table():
        nonlocal in_table, table_headers, table_alignments, table_rows
        if not in_table:
            return
        res = ['<div class="table-container"><table>']
        if table_headers:
            res.append('<thead><tr>')
            for i, h in enumerate(table_headers):
                align = f' style="text-align:{table_alignments[i]}"' if i < len(table_alignments) and table_alignments[i] else ''
                res.append(f'<th{align}>{parse_inline(h)}</th>')
            res.append('</tr></thead>')
        if table_rows:
            res.append('<tbody>')
            for row in table_rows:
                res.append('<tr>')
                for i, cell in enumerate(row):
                    align = f' style="text-align:{table_alignments[i]}"' if i < len(table_alignments) and table_alignments[i] else ''
                    res.append(f'<td{align}>{parse_inline(cell)}</td>')
                res.append('</tr>')
            res.append('</tbody>')
        res.append('</table></div>')
        html_out.append('\n'.join(res))
        in_table = False
        table_headers = []
        table_alignments = []
        table_rows = []

    def flush_list():
        nonlocal in_list, list_type
        if in_list:
            html_out.append(f'</{list_type}>')
            in_list = False

    def flush_blockquote():
        nonlocal in_blockquote, blockquote_lines
        if in_blockquote:
            content = "<br>\n".join(parse_inline(l) for l in blockquote_lines)
            html_out.append(f'<blockquote>{content}</blockquote>')
            in_blockquote = False
            blockquote_lines = []

    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Code blocks
        if line.startswith('```'):
            if in_code_block:
                code_text = html.escape("\n".join(code_lines))
                lang_attr = f' class="language-{code_lang}"' if code_lang else ''
                html_out.append(f'<pre><code{lang_attr}>{code_text}</code></pre>')
                in_code_block = False
                code_lines = []
                code_lang = ""
            else:
                flush_table()
                flush_list()
                flush_blockquote()
                in_code_block = True
                code_lang = line[3:].strip()
                code_lines = []
            i += 1
            continue
            
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue
            
        stripped = line.strip()
        
        # 2. Table handling
        if stripped.startswith('|') and stripped.endswith('|'):
            flush_list()
            flush_blockquote()
            cells = [c.strip() for c in stripped[1:-1].split('|')]
            is_separator = all(re.match(r'^:?-+:?$', c) for c in cells)
            
            if is_separator:
                table_alignments = []
                for c in cells:
                    if c.startswith(':') and c.endswith(':'):
                        table_alignments.append('center')
                    elif c.endswith(':'):
                        table_alignments.append('right')
                    else:
                        table_alignments.append('left')
            elif not in_table:
                in_table = True
                table_headers = cells
            else:
                table_rows.append(cells)
            i += 1
            continue
        else:
            flush_table()
            
        # 3. Blockquotes
        if stripped.startswith('>'):
            flush_list()
            in_blockquote = True
            blockquote_lines.append(stripped[1:].strip())
            i += 1
            continue
        else:
            flush_blockquote()
            
        # 4. Blank lines
        if not stripped:
            flush_list()
            i += 1
            continue
            
        # 5. Horizontal Rules
        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', stripped):
            flush_list()
            html_out.append('<hr>')
            i += 1
            continue
            
        # 6. Headings
        heading_match = re.match(r'^(#{1,6})\s+(.*)$', line)
        if heading_match:
            flush_list()
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2)
            html_out.append(f'<h{level}>{parse_inline(heading_text)}</h{level}>')
            i += 1
            continue
            
        # 7. Lists
        ul_match = re.match(r'^(\s*)[-*]\s+(.*)$', line)
        ol_match = re.match(r'^(\s*)(\d+)\.\s+(.*)$', line)
        
        if ul_match:
            item_text = ul_match.group(2)
            if item_text.startswith('[ ] '):
                item_text = '<input type="checkbox" disabled> ' + item_text[4:]
            elif item_text.startswith('[x] ') or item_text.startswith('[X] '):
                item_text = '<input type="checkbox" checked disabled> ' + item_text[4:]
                
            if not in_list or list_type != "ul":
                flush_list()
                in_list = True
                list_type = "ul"
                html_out.append('<ul>')
            html_out.append(f'<li>{parse_inline(item_text)}</li>')
            i += 1
            continue
        elif ol_match:
            item_text = ol_match.group(3)
            if not in_list or list_type != "ol":
                flush_list()
                in_list = True
                list_type = "ol"
                html_out.append('<ol>')
            html_out.append(f'<li>{parse_inline(item_text)}</li>')
            i += 1
            continue
        else:
            flush_list()
            
        # 8. Regular paragraph
        html_out.append(f'<p>{parse_inline(line)}</p>')
        i += 1
        
    flush_table()
    flush_list()
    flush_blockquote()
    
    return "\n".join(html_out)

css_styles = """
@page {
    size: A4 portrait;
    margin: 18mm 14mm 18mm 14mm;
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.5;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
}

.report-header {
    border-bottom: 3px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 20px;
}

.report-title {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
}

.report-subtitle {
    font-size: 11pt;
    font-weight: 600;
    color: #475569;
    margin: 0 0 10px 0;
}

.meta-grid {
    display: table;
    width: 100%;
    margin-top: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 8.5pt;
}

h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 14px;
    page-break-after: avoid;
}

h2 {
    font-size: 12.5pt;
    font-weight: 700;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 20px;
    margin-bottom: 10px;
    page-break-after: avoid;
}

h3 {
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
}

h4 {
    font-size: 9.5pt;
    font-weight: 600;
    color: #475569;
    margin-top: 10px;
    margin-bottom: 4px;
    page-break-after: avoid;
}

p {
    margin-top: 0;
    margin-bottom: 8px;
    text-align: justify;
}

ul, ol {
    margin-top: 0;
    margin-bottom: 8px;
    padding-left: 18px;
}

li {
    margin-bottom: 3px;
}

hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
}

blockquote {
    border-left: 3.5px solid #2563eb;
    background-color: #eff6ff;
    padding: 6px 12px;
    margin: 10px 0;
    border-radius: 0 4px 4px 0;
    color: #1e40af;
    font-size: 9pt;
}

.table-container {
    width: 100%;
    margin: 10px 0 14px 0;
    page-break-inside: avoid;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin: 0;
}

th, td {
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
}

th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
}

tr:nth-child(even) td {
    background-color: #f8fafc;
}

tr {
    page-break-inside: avoid;
}

code {
    font-family: Consolas, "Liberation Mono", Courier, monospace;
    font-size: 8pt;
    background-color: #f1f5f9;
    color: #b91c1c;
    padding: 1.5px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
}

pre {
    background-color: #0f172a;
    color: #f8fafc;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 7.8pt;
    line-height: 1.35;
    overflow-x: auto;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
}

pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
}

.badge {
    display: inline-block;
    padding: 1px 5px;
    font-size: 7.5pt;
    font-weight: 700;
    border-radius: 3px;
    letter-spacing: 0.2px;
}

.badge-danger {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
}

.badge-warning {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.badge-success {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

a {
    color: #2563eb;
    text-decoration: none;
}

input[type="checkbox"] {
    margin-right: 4px;
    vertical-align: middle;
}
"""

def main():
    with open('FINANCIAL_ACCOUNTING_AUDIT.md', 'r', encoding='utf-8') as f:
        md_content = f.read()
        
    body_html = markdown_to_html(md_content)
    
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Comprehensive Financial, Accounting & Statutory Audit Report</title>
    <style>
{css_styles}
    </style>
</head>
<body>
{body_html}
</body>
</html>
"""
    with open('FINANCIAL_ACCOUNTING_AUDIT.html', 'w', encoding='utf-8') as f:
        f.write(full_html)
    print("FINANCIAL_ACCOUNTING_AUDIT.html compiled.")

if __name__ == '__main__':
    main()
