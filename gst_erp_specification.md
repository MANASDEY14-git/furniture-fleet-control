# Enterprise Resource Planning (ERP) GST Module Architecture for the Indian Furniture Retail and Wholesale Industry

## 1. Executive Overview and Regulatory Landscape

Designing an Enterprise Resource Planning (ERP) GST module for the Indian furniture retail and wholesale industry requires balancing high-volume Point of Sale (POS) retail transactions with multi-tiered B2B distribution logistics. The furniture sector operates across diverse operational models, including physical retail flagships, online direct-to-consumer platforms, commercial contract manufacturing, and multi-state wholesale distribution networks. System architecture must handle Harmonized System of Nomenclature (HSN) classifications across Chapters 94 and 44, comply with Input Tax Credit (ITC) restrictions under Section 17(5) of the Central Goods and Services Tax (CGST) Act, and integrate real-time E-Way Bill (EWB) and E-Invoicing protocols.

Indian GST operates on a dual-tax framework where intra-state supplies attract equal proportions of Central GST (CGST) and State GST (SGST), whereas inter-state supplies are subject to Integrated GST (IGST). Tax determination relies on evaluating the Place of Supply (PoS) relative to the Location of the Supplier Origin (LSO). The tax type determination rule within the ERP calculation core is represented mathematically as:

$$
\text{Tax Type} = \begin{cases} \text{CGST} + \text{SGST} & \text{if } \text{POS} = \text{LSO} \\ \text{IGST} & \text{if } \text{POS} \neq \text{LSO} \end{cases}
$$

Under recent GST 2.0 reforms, statutory rate structures have been streamlined to eliminate legacy 12% and 28% ambiguities, consolidating most goods into 5%, 18%, and 40% slabs. Concurrently, tax administration has instituted automated invoice locking, hard 3-year return filing limits, and mandatory real-time invoice matching via the Invoice Management System (IMS). Consequently, the ERP core must pair normalized relational database persistence with an in-memory caching layer to maintain transactional throughput and audit capability.

---

## 2. HSN Classification Master and Tax Rate Engine

Furniture and home decor products are classified primarily under Chapter 94 of the HSN tariff schedule, with specialized wooden artware and turned components falling under Chapter 44. The primary classification objective for the ERP item master is managing dynamic, material-dependent, and value-based tax schedules.

### Chapter 94 and Chapter 44 Tariff Classifications
Chapter 94 encompasses seats, general domestic and office furniture, medical furniture, mattresses, and lighting fixtures. Most commercial, office, and residential furniture items—irrespective of whether they are constructed from wood, steel, plastic, or upholstered frames—attract a standard GST rate of 18%. Concessional rates of 12% or 5% apply selectively to handcrafted bamboo, cane, or rattan items, as well as specialized transport seating.

| HSN Code | Description | Standard Base GST Rate | CGST Rate | SGST Rate | IGST Rate | Statutory Classification Condition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **9401** | Seats (other than medical/aircraft), swivel chairs, convertible beds | 18% | 9% | 9% | 18% | Standard base rate for all general seating items. |
| **9401 10 00** | Aircraft seats | 5% | 2.5% | 2.5% | 5% | Concessional schedule rate. |
| **9401 50 / 9403 80** | Seats and furniture of bamboo, rattan, or cane | 12% | 6% | 6% | 12% | Conditional on primary material composition. |
| **9402** | Medical, surgical, dental, or veterinary furniture | 18% | 9% | 9% | 18% | Includes hospital beds with mechanical fittings. |
| **9403 10** | Metal furniture used in offices (steel cabinets, desks) | 18% | 9% | 9% | 18% | Commercial office metal furniture range. |
| **9403 30** | Wooden furniture used in offices | 18% | 9% | 9% | 18% | Desk systems, workstation partitions, wooden tables. |
| **9403 40** | Wooden furniture used in kitchens | 18% | 9% | 9% | 18% | Modular kitchen cabinets and wooden built-ins. |
| **9403 50** | Wooden furniture used in bedrooms | 18% | 9% | 9% | 18% | Bedsteads, wardrobes, bedside units. |
| **9403 60** | Other wooden furniture (living room, dining) | 18% | 9% | 9% | 18% | General domestic wooden furniture range. |
| **9403 70** | Furniture of plastics | 18% | 9% | 9% | 18% | Molded plastic chairs, tables, and storage units. |
| **9403 90 00** | Parts of furniture | 18% | 9% | 9% | 18% | Replacement components, unmounted panels. |
| **9404** | Mattresses, bedding, cushions, stuffed furnishings | 18% | 9% | 9% | 18% | Spring, cellular rubber, or plastic mattresses. |
| **9404 10 / 9404 90** | Cotton quilts (Value-dependent historical threshold) | 5% / 12% | 2.5% / 6% | 2.5% / 6% | 5% / 12% | 5% rate if unit value $\le$ ₹1,000; 12% if $>$ ₹1,000. |
| **9405** | Luminaires and lighting fittings, illuminated signs | 18% | 9% | 9% | 18% | General lighting fixtures and commercial signs. |
| **9405 10 / 9405 40** | LED lights, lamps, and drivers | 12% | 6% | 6% | 12% | Specific green energy schedule. |
| **4420 / 4421** | Wooden artware, inlaid wood, statuettes, wooden hangers | 12% | 6% | 6% | 12% | Decorative wooden items outside Chapter 94. |

---

## 3. ERP Classification Rules Engine Logic

The ERP tax computation engine relies on a multi-attribute decision tree to dynamically select HSN codes and tax rates during transaction processing:

1. **Material Composition Test:** When an inventory SKU is flagged with a primary composition of bamboo, rattan, or cane, the system overrides standard wooden furniture classifications (940360) and routes the transaction to 940150 or 940380, applying the concessional 12% rate. All other standard wood, metal, plastic, or upholstered products route to 18% schedules.
2. **Value-Based Threshold Evaluation:** For specified soft furnishings under HSN 9404, the engine compares the net unit transaction price ($P_{unit}$) against statutory price ceilings:
   $$
   \text{Applicable Rate} = \begin{cases} 5\% & \text{if } P_{unit} \le 1000 \\ 12\% / 18\% & \text{if } P_{unit} > 1000 \end{cases}
   $$
3. **Composite and Mixed Supplies:** Under Section 8 of the CGST Act, when furniture is sold alongside delivery and on-site installation, the ERP assesses whether the transaction constitutes a bundled composite supply. If the principal supply is modular furniture, the entire bundle adopts the principal item's HSN code (940340 or 940330) and is taxed at 18%. Conversely, if fitting work involves permanent structural alterations capitalized to the customer's property, the ERP forces a split-billing mechanism to prevent improper ITC claims on civil works.

---

## 4. Input Tax Credit Mechanics and Section 17(5) Compliance Engine

Input Tax Credit (ITC) management directly affects net operating margins in furniture enterprises. However, distinguishing between claimable business inputs and blocked credits under Section 17(5) of the CGST Act requires automated controls within the Procurement and Accounts Payable modules.

### The Immovable Property Conflict: Showroom Fit-Outs vs. Movable Inventory
Furniture retailers invest heavily in physical infrastructure, experience centers, and regional distribution hub fit-outs. Section 17(5)(c) blocks ITC on works contract services supplied for constructing immovable property. Section 17(5)(d) similarly blocks ITC on goods or services acquired by a taxable person for constructing immovable property on their own account, even when used in the course or furtherance of business.

Statutory "construction" includes reconstruction, renovation, additions, or alterations to the extent that such expenses are capitalized to the immovable property asset account. The judicial "functionality test" evaluates whether an asset acts as an operational plant or machinery or merely serves as the physical space in which business is conducted.

The procurement invoice ingestion pipeline processes expenses through a multi-tier decision sequence. When an invoice enters the Accounts Payable module, the engine determines whether the line item is capitalized or expensed directly to the profit and loss account.
* If expensed as routine repairs and maintenance, full Input Tax Credit is allowed, subject to Invoice Management System (IMS) validation.
* If capitalized, the asset classification engine differentiates between immovable property and movable capital goods.
  * Expenses associated with civil works, in-wall electrical ducting, false ceilings, and centralized HVAC systems are classified as immovable property, causing the system to automatically block ITC under Section 17(5)(d) and route the un-claimable tax to the asset cost center.
  * Conversely, loose showroom furniture, demountable display racks, cassette air conditioners, and POS hardware are categorized as movable capital goods, allowing the ERP to clear the full ITC claim.

### ERP Decision Matrix for Capital Expenditure and Fit-Outs
The ERP Asset Accounting module automatically assigns statutory ITC eligibility flags based on asset accounting treatment and physical movability parameters.

| Fit-Out / Procurement Item | Accounting Treatment | Movability Status | Statutory Provision | ERP System Action / ITC Eligibility Flag |
| :--- | :--- | :--- | :--- | :--- |
| Loose Showroom Furniture (Sofas, Display Tables) | Capitalized to Office Equipment / Furniture | Fully Movable | Section 16(1) | **ELIGIBLE:** Fully claimable as Capital Goods ITC. |
| Modular Display Racks / Shelving | Capitalized to Plant & Fixtures | Demountable / Movable | Section 16(1) | **ELIGIBLE:** Unrestricted ITC claim. |
| Split & Cassette Air Conditioners | Capitalized to Equipment | Movable without structural damage | Section 16(1) | **ELIGIBLE:** System permits ITC claim. |
| Centralized Ducting AC Systems | Capitalized to Building / Leasehold | Immovable (attached to structure) | Section 17(5)(c)/(d) | **BLOCKED:** Tax posted to Asset Cost center. |
| False Ceilings & Gypsum Partitions | Capitalized to Leasehold Improvements | Immovable Civil Structure | Section 17(5)(d) | **BLOCKED:** Hard stop on ITC claim. |
| In-Wall Electrical Wiring & Plumbing | Capitalized to Building / Showroom | Immovable | Section 17(5)(d) | **BLOCKED:** Expense capitalized incl. GST. |
| Showroom Touch-Up Painting / Minor Repairs | Expensed to P&L (Repairs & Maintenance) | Operational Expense | Section 16(1) | **ELIGIBLE:** Expense item allowed for ITC. |
| Commercial Showroom Lease Rent | Expensed to P&L (Rent Expense) | Operating Supply | Section 16(1) / SAC 997212 | **ELIGIBLE:** Full ITC set-off against output GST. |

### Commercial Rent Mechanics: FCM vs. RCM
Renting commercial real estate for showrooms or warehouses is taxable at 18% GST under SAC 997212. The ERP system executes two distinct compliance paths depending on landlord registration:
* **Forward Charge Mechanism (FCM):** Applicable when the landlord is GST-registered. The landlord issues a tax invoice charging 18% GST. The tenant pays the invoice and claims ITC in GSTR-3B following IMS verification.
* **Reverse Charge Mechanism (RCM):** Triggered when a registered business rents commercial property from an unregistered entity or specified entities under Entry 5AA. The tenant must self-assess 18% GST. The ERP generates an internal RCM payment voucher, records the liability in the Electronic Cash Ledger, and simultaneously generates an eligible ITC entry for the same tax period.

---

## 5. Supply Chain Logistics: Bill-To/Ship-To, E-Way Bill, and E-Invoicing

Furniture wholesale and retail involve complex physical supply chains, including drop-shipping from manufacturers, multi-state fulfillment routing, and direct-to-site deliveries. The ERP module must automate compliance with GST Place of Supply rules, E-Way Bill (EWB) generation, and E-Invoicing standards.

### Place of Supply Rules for Furniture Transactions
Place of Supply (PoS) framework under Section 10 of the Integrated Goods and Services Tax (IGST) Act dictates tax type assignment:
* **Supply Involving Movement (Section 10(1)(a)):** The PoS is defined as the location where movement terminates for delivery to the recipient. For instance, when a wholesaler in Mumbai dispatches dining sets to a retailer in Ahmedabad, the movement ends in Gujarat. Thus, the PoS is Gujarat, prompting the ERP to charge IGST.
* **Bill-To / Ship-To Model (Section 10(1)(b)):** When goods are delivered to a third-party recipient (Ship-To) on the instruction of the purchasing party (Bill-To), the law deems that the purchasing party received the goods. The PoS is the principal place of business of the Bill-To entity. For example, if a corporate customer in Delhi (Bill-To) buys office workstations from a manufacturer in Bengaluru and instructs them to ship directly to a branch office in Hyderabad (Ship-To), the PoS is Delhi. The manufacturer issues an inter-state IGST invoice to the Delhi corporate entity.
* **Supply Without Movement (Section 10(1)(c)):** When goods are transferred without physical movement (such as acquiring installed showroom fixtures on-site), the PoS is the location of the goods at the time of delivery. If an enterprise buys display fixtures currently situated inside a showroom in Gurugram, the PoS is Haryana, requiring an IGST charge if the buyer is registered in another state.

### E-Way Bill and E-Invoicing Compliance Integration
An E-Way Bill is mandatory for any goods movement where the consolidated consignment value exceeds ₹50,000. Consolidated consignment value equals the net taxable value plus applicable CGST, SGST, IGST, and Cess.

The ERP dispatch validation module operates synchronously during invoice or delivery challan creation. The engine first checks whether the total consignment value exceeds ₹50,000. If the threshold is breached, the system initiates payload validation:
* **Mandatory Ship-To GSTIN:** In Bill-To/Ship-To transactions, populating only the primary billing GSTIN is invalid. The system must inject the destination facility's specific registration number into the `ShipToGSTIN` payload attribute.
* **Unregistered Person ("URP") Tagging:** When shipping directly to end-consumers (B2C) or unregistered entities, the `ShipToGSTIN` attribute must be set explicitly to `"URP"`, signifying an end-user delivery destination.
* **Document Age Limits:** E-Way Bills must be generated concurrently with invoice generation. Backdated EWB generation against historical documents is blocked by portal validation rules.
* **Universal Closure Workflow:** Upon physical arrival at the destination warehouse, the receiving team or carrier can trigger an API closure call to terminate the EWB lifecycle, preventing unauthorized transit recycling.

Upon successful API validation, the ERP transmits the JSON payload to the NIC EWB portal, receives a unique 12-digit E-Way Bill Number (EBN) alongside a QR code, and embeds these credentials into physical dispatch documents.

---

## 6. Enterprise Database Schema and Architectural Specifications

To guarantee transactional consistency, auditability, and sub-second execution, the ERP database schema uses a normalized relational model with strict field constraints.

### Relational Database Schema Design (ANSI SQL Specification)

#### 1. `gst_hsn_master`
Stores primary HSN codes, descriptions, and structural product categories.
```sql
CREATE TABLE gst_hsn_master (
    hsn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    chapter_number VARCHAR(2) NOT NULL, -- '94' or '44'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `gst_tax_rate_schedule`
Configures tax schedules, temporal validity, and price-dependent rate breaks.
```sql
CREATE TABLE gst_tax_rate_schedule (
    rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_id UUID NOT NULL REFERENCES gst_hsn_master(hsn_id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    cgst_rate DECIMAL(5,2) NOT NULL, -- e.g., 9.00
    sgst_rate DECIMAL(5,2) NOT NULL, -- e.g., 9.00
    igst_rate DECIMAL(5,2) NOT NULL, -- e.g., 18.00
    min_value_threshold DECIMAL(12,2) DEFAULT 0.00,
    max_value_threshold DECIMAL(12,2),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
```

#### 3. `entity_gstin_master`
Tracks enterprise registrations, warehouse locations, and vendor/customer tax profiles.
```sql
CREATE TABLE entity_gstin_master (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    gstin VARCHAR(15) NOT NULL UNIQUE,
    state_code VARCHAR(2) NOT NULL, -- First 2 digits of GSTIN
    address_line1 TEXT NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    registration_type VARCHAR(20) NOT NULL -- 'REGULAR', 'COMPOSITION', 'URP'
);
```

#### 4. `sales_invoice_header`
Captures transaction-level headers, place of supply data, and tax summaries.
```sql
CREATE TABLE sales_invoice_header (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(16) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    seller_gstin VARCHAR(15) NOT NULL REFERENCES entity_gstin_master(gstin),
    bill_to_gstin VARCHAR(15) NOT NULL,
    ship_to_gstin VARCHAR(15) NOT NULL, -- gstin or 'URP'
    place_of_supply VARCHAR(2) NOT NULL, -- 2-digit State Code
    total_taxable_value DECIMAL(14,2) NOT NULL,
    total_cgst_amount DECIMAL(14,2) NOT NULL,
    total_sgst_amount DECIMAL(14,2) NOT NULL,
    total_igst_amount DECIMAL(14,2) NOT NULL,
    irn_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. `sales_invoice_line_item`
Maintains line-level transaction data, product codes, HSN links, and line item tax amounts.
```sql
CREATE TABLE sales_invoice_line_item (
    line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES sales_invoice_header(invoice_id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    hsn_code VARCHAR(10) NOT NULL REFERENCES gst_hsn_master(hsn_code),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    taxable_value DECIMAL(12,2) NOT NULL,
    cgst_rate DECIMAL(5,2) NOT NULL,
    cgst_amount DECIMAL(12,2) NOT NULL,
    sgst_rate DECIMAL(5,2) NOT NULL,
    sgst_amount DECIMAL(12,2) NOT NULL,
    igst_rate DECIMAL(5,2) NOT NULL,
    igst_amount DECIMAL(12,2) NOT NULL
);
```

#### 6. `eway_bill_transaction`
Manages E-Way Bill lifecycle data, vehicle updates, and validity windows.
```sql
CREATE TABLE eway_bill_transaction (
    ewb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES sales_invoice_header(invoice_id),
    ewb_number VARCHAR(12) UNIQUE,
    generated_date TIMESTAMP,
    valid_until TIMESTAMP,
    transporter_id VARCHAR(15),
    vehicle_number VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED' -- 'GENERATED', 'IN_TRANSIT', 'CANCELLED', 'CLOSED'
);
```

#### 7. `itc_ledger_entry`
Tracks Accounts Payable ITC eligibility, Section 17(5) blocking reasons, and IMS state flags.
```sql
CREATE TABLE itc_ledger_entry (
    itc_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_invoice_id UUID NOT NULL,
    asset_category VARCHAR(50) NOT NULL, -- 'CIVIL_WORKS', 'LOOSE_FURNITURE', 'RENT', etc.
    is_capitalized BOOLEAN NOT NULL,
    itc_eligibility VARCHAR(20) NOT NULL, -- 'ELIGIBLE', 'BLOCKED_17_5', 'INELIGIBLE_EXEMPT'
    blocking_reason TEXT,
    ims_match_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'MATCHED', 'MISMATCHED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. In-Memory Caching Architecture and High-Throughput POS Routing

Point of Sale (POS) environments in furniture retail networks demand rapid processing times during customer checkout. Querying relational database storage during peak checkout periods can create latency. To resolve this, an in-memory key-value caching layer (e.g., Redis) is deployed to serve tax configurations, validate GSTINs, and resolve Place of Supply rules.

The POS tax determination execution path prioritizes in-memory key-value lookups over relational database queries. Upon scanning an item barcode at POS checkout, the application issues an asynchronous cache request to retrieve the corresponding HSN tax structure.
* If a cache hit occurs, the tax parameters are loaded directly into memory.
* If a cache miss occurs, the system falls back to the persistent relational database, populates the returned data into the in-memory cache with an assigned Time-To-Live (TTL), and completes the calculation pipeline.

### Cache Schema Design and Key Structures

| Cache Key Pattern | Redis Data Type | Stored Data Payload / Value Structure | TTL Strategy | Cache Invalidation Event |
| :--- | :--- | :--- | :--- | :--- |
| `hsn:rate:{hsn_code}:{price_bucket}` | String (JSON) | `{"cgst": 9.0, "sgst": 9.0, "igst": 18.0, "hsn_id": "uuid"}` | 24 Hours | Master update to `gst_tax_rate_schedule` table. |
| `gstin:profile:{gstin_number}` | Hash | `field: state_code, field: reg_type, field: status, field: trade_name` | 12 Hours | Vendor/Customer profile edit. |
| `pos:rule:{origin_state}:{dest_state}` | String | `"INTRA"` if origin == dest else `"INTER"`. | 7 Days | Statutory amendments to Place of Supply rules. |
| `ewb:threshold:{state_code}` | String | Numeric threshold value (e.g., `"50000"`). | 30 Days | State notification changing EWB limits. |

### In-Memory Tax Calculation Execution Logic
During cart computation or wholesale invoice processing, the calculation engine executes the following arithmetic steps:

1. **Calculate the Net Taxable Line Value:**
   $$
   V_{\text{taxable}\_i} = (Q_i \times P_i) - D_{\text{line}\_i} - D_{\text{header\_pro\_rata}\_i}
   $$
   Where $Q_i$ represents line item quantity, $P_i$ is unit list price, $D_{\text{line}\_i}$ is pre-tax line discount, and $D_{\text{header\_pro\_rata}\_i}$ is the allocated portion of invoice-level trade discounts complying with Section 15(3).

2. **Apply Tax Component Calculations:**
   * **For Inter-State Transactions ($POS \neq LSO$):**
     $$
     T_{\text{IGST}\_i} = V_{\text{taxable}\_i} \times \left(\frac{R_{\text{IGST}\_i}}{100}\right)
     $$
   * **For Intra-State Transactions ($POS = LSO$):**
     $$
     T_{\text{CGST}\_i} = V_{\text{taxable}\_i} \times \left(\frac{R_{\text{CGST}\_i}}{100}\right)
     $$
     $$
     T_{\text{SGST}\_i} = V_{\text{taxable}\_i} \times \left(\frac{R_{\text{SGST}\_i}}{100}\right)
     $$

---

## 8. Compliance Engine, Audit Trails, and System Integration

The ERP GST module must interface cleanly with statutory government portals, including the Invoice Registration Portal (IRP) for E-Invoicing, the National Informatics Centre (NIC) portal for E-Way Bills, and the GST Network (GSTN) portal for monthly return processing.

### Statutory Reconciliation and Return Engine
The system automates the generation and cross-verification of core monthly tax filings:
The statutory reconciliation framework coordinates internal accounting ledgers with external government tax portals.
* **Outward Supply:** Sales invoices, credit notes, and B2C summaries are compiled into Form GSTR-1 files, categorizing B2B sales by recipient GSTIN and B2C sales by destination state.
* **Inward Supply:** Purchase records are reconciled against vendor data imported from Form GSTR-2B via the Invoice Management System (IMS). The engine flags matching line items, identifies missing inward invoices, and segregates blocked credits under Section 17(5).
* **Net Cash Tax Liability:** The system calculates net cash liabilities for Form GSTR-3B submission, applying verified ITC balances against output tax obligations.

Net cash tax liability for filing period $t$ is expressed as:

$$
\text{Net Cash Tax Payable}_t = \max\left(0, \text{Output Liability}_t - \text{Eligible Verified ITC}_t\right)
$$

The compliance engine enforces hard locking against GSTR-2B verified lines, preventing manual input of unverified provisional credits and enforcing the statutory 3-year return filing window.

### Credit Notes and Post-Sale Volume Discounts
Wholesale furniture distribution relies heavily on volume-based post-sale discounts. Section 15(3)(b) permits reducing taxable values via tax credit notes only when specific criteria are satisfied:
1. The discount must be established under a pre-existing agreement executed prior to or at the time of supply.
2. The discount must be explicitly linked to original tax invoice numbers.
3. The buyer must reverse the input tax credit corresponding to the discount.

The ERP Sales Ledger module enforces original invoice linkage whenever a GST Credit Note is created under Section 34. If a credit note cannot be mapped to an original tax invoice, the system issues a financial credit note without adjusting output GST liabilities, preventing compliance disputes.

### Audit Trail and System Integrity Controls
Tax compliance modules require immutable transaction logging to maintain auditability under tax authority reviews:
Every manual override—such as modifying tax parameters, altering HSN mappings, or adjusting an ITC eligibility flag—appends a record to an unalterable audit log table. This log records the active user ID, timestamp, old parameter value, new parameter value, and authorization key. Furthermore, the database layer enforces a hard locking constraint that prevents updates, deletions, or backdated entries for tax periods closed more than three years prior, aligning with portal enforcement rules.

---

## 9. Executive Summary and Implementation Roadmap

Deploying a GST module tailored for Indian furniture retail and wholesale requires linking regulatory requirements directly with ERP technical architecture. Correctly modeling HSN codes under Chapter 94 and Chapter 44 establishes the base for tax determination. Concurrently, implementing real-time Place of Supply logic handles complex distribution structures, including drop-shipping and multi-state warehouse networks.

From a compliance perspective, automating Section 17(5) restrictions prevents credit reversals and interest penalties by automatically separating claimable movable capital goods from non-claimable immovable fit-outs. Coupling a normalized SQL schema with an in-memory Redis cache allows the system to deliver sub-second performance during high-volume retail checkouts while maintaining full auditability.

### Engineering Implementation Steps
1. **Establish the relational schema** and seed the HSN tax master tables.
2. **Build the Place of Supply rules engine** and integrate the in-memory caching layer.
3. **Deploy the dispatch validation module** to interface with official E-Way Bill and E-Invoicing APIs.
4. **Configure the Accounts Payable Section 17(5) decision matrix** and automated GSTR-2B/IMS reconciliation pipelines.

Following this roadmap ensures complete statutory compliance, minimizes tax leakage, and delivers a scalable technical foundation for multi-channel furniture enterprises.
