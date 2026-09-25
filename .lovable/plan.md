# Legally compliant inter-store stock transfers

## Objective

Add a controlled transfer process that moves real stock from one store to another and creates the correct inventory, GST, and accounting records. The confirmed operating model is:

- Stores have **different GSTINs**.
- Transfers use the **actual purchase cost** of the units moved.
- Control is **two-step**: the source store dispatches; the destination store confirms receipt and records discrepancies.

Because different GST registrations are “distinct persons” under Indian GST, each dispatch is treated as a taxable supply even when the stores belong to the same PAN and no cash changes hands. The system will therefore produce a tax invoice, tax entries, goods-in-transit records, and inter-branch balances—not a simple quantity adjustment.

## What exists and what must change

The current app has store-scoped item rows, purchase/sale stock triggers, manual stock adjustments, a stock ledger, access by store, and financial-year snapshots. It does **not** currently have a transfer record, goods-in-transit ledger, transfer document, or reliable product identity linking the same item across stores.

Transfers will be a separate auditable module. They will not be inserted as purchases, sales orders, payments, or ordinary stock adjustments, because that would distort customer sales, supplier purchases, cash, KPIs, and reorder demand.

## 1. Establish legal and product masters

### Store tax profile

Extend each store with controlled legal details:

- Legal/trade name, GSTIN, PAN linkage, registered address, state and state code
- GST registration status and effective dates
- Invoice series and next transfer-invoice number
- E-invoicing applicability
- Default inter-branch receivable/payable accounts

GSTIN format will be validated. Once a transfer is dispatched, the legal identity used on it is frozen as a snapshot so later store edits cannot rewrite history.

### Shared product identity

Introduce a shared product master and link each store’s existing item row to it:

- Product/SKU, description, category, HSN/SAC, GST rate and unit of measure
- Store-item mapping for the same product at source and destination
- Variant mapping where variants are used

Existing items will be matched conservatively and placed in a review queue when the match is ambiguous. Names alone will never silently decide that two store items are the same product.

### Actual-cost traceability

Introduce inventory cost lots tied to purchase lines or opening stock:

- Purchase reference, source store, received date, available quantity and actual unit cost
- Transfer allocation by lot; identifiable furniture can use its exact lot
- FIFO is the default allocation only when multiple indistinguishable lots exist, while preserving every source cost layer
- Current stock without usable purchase history receives a one-time opening-cost lot, explicitly marked as migrated and requiring approval

This is necessary because the current item-level `cost_price` cannot prove which purchase cost belongs to the physical units transferred.

## 2. Transfer workflow

```text
Draft → Dispatched / In transit → Received
                         └──────→ Received with discrepancy → Resolved
Draft → Cancelled
```

### Draft

The source user selects destination, products/variants, quantities, actual cost lots, dispatch date, reason, transporter, vehicle/LR details, and expected arrival. The system checks:

- The user can operate the source store
- Source and destination differ and both tax profiles are complete
- The destination has an approved mapping for every product
- Available stock and lot quantity are sufficient
- HSN and GST rates are present
- The accounting/tax period is open

Drafts reserve nothing and create no accounting entry.

### Dispatch — source-store action

A single database transaction will:

1. Lock the source stock and selected cost lots.
2. Revalidate quantities to prevent concurrent over-transfer.
3. Allocate exact cost layers and decrement source on-hand stock.
4. Create goods-in-transit quantities at the same actual cost.
5. Freeze invoice, product, address, tax, lot, and valuation snapshots.
6. Generate a unique stock-transfer tax invoice number.
7. Calculate IGST for interstate transfers or CGST + SGST for intrastate transfers from the registered state codes.
8. Record e-way bill requirements and prevent dispatch completion when a legally required reference is missing, subject to configured state rules.
9. Post balanced transfer journals and an immutable dispatch event.

After dispatch, quantities, valuation and tax fields cannot be edited. Corrections use cancellation within the permitted stage or a controlled debit/credit-note and return-transfer workflow.

### Receipt — destination-store action

The destination user sees only transfers addressed to an accessible store and records quantities as received, damaged, or short. A single transaction will:

- Increase destination inventory only by accepted quantity
- Carry the actual source lot cost into destination stock
- Clear the matching goods-in-transit quantity
- Create the destination GST input and inter-branch payable entries
- Produce a goods receipt note and immutable receipt event
- Route shortages/damage to a discrepancy case rather than silently changing the invoice

The same person cannot act as both dispatcher and receiver. Receipt is idempotent so retries cannot duplicate stock or journals.

## 3. GST and transport documents

For the confirmed different-GSTIN model, every dispatch produces:

- **Tax invoice** for the deemed supply between distinct persons
- **E-way bill record** when applicable, with number, date, validity, vehicle/transporter and status
- **Goods receipt note** at destination
- Debit/credit note references for approved post-dispatch corrections

The initial release will record and validate government-issued IRN/e-way bill details; it will not claim to generate them through GST portals without an approved GSP/API integration.

### Valuation rule

The commercial policy will use actual purchase cost. Before activation, the accountant must confirm that each destination GSTIN is eligible for full ITC, allowing the declared invoice value to be accepted under the Rule 28 proviso. If full ITC is unavailable, the system must require an accountant-approved Rule 28 valuation method (open-market value, like-kind value, 110% of cost, or other permitted basis) rather than automatically using cost.

## 4. Double-entry accounting

Add a proper transfer subledger with immutable journal headers and balanced journal lines. At dispatch, using taxable value ₹100 and GST ₹18 as an example:

**Source GST registration**

```text
Dr Inter-branch receivable       118
  Cr Inter-branch transfer revenue   100
  Cr Output GST payable               18

Dr Inter-branch transfer cost    100
  Cr Inventory                       100
```

**Destination GST registration, on accepted receipt**

```text
Dr Inventory                     100
Dr Input GST receivable           18
  Cr Inter-branch payable            118
```

For the combined books of the same legal entity, reconciliation will eliminate the matching inter-branch receivable/payable and transfer revenue/cost. Inventory remains at actual historical cost, so no unrealized internal profit is carried in closing stock.

No payment or bank movement is generated. Inter-branch balances are settled through reconciliation/elimination, not through the customer or supplier ledgers.

Freight, insurance, transit loss and ITC reversal will use separately configured accounts. Whether freight is capitalized into inventory or expensed will be an accountant-approved company policy applied consistently.

## 5. Data and security design

Create dedicated records for:

- Store tax profiles and statutory numbering
- Shared products and store-product mappings
- Inventory cost lots and lot allocations
- Transfer headers, lines and receipts
- Goods-in-transit balances
- Transfer discrepancies and resolutions
- Tax/e-way bill document snapshots
- Journal entries and journal lines
- Immutable transfer events and attachments

All tables will have explicit grants and RLS. Direct status-changing writes will be blocked; database RPCs will perform draft, dispatch, receipt, discrepancy resolution and cancellation atomically. Each action validates the signed-in user, current role, store access and transition. Source users can draft/dispatch for their stores; destination users can receive for theirs; accountants/admins can review tax, valuation and reconciliation without bypassing the audit trail.

## 6. User experience

Add **Transfers** to the Inventory Hub with four practical views:

- **To dispatch** — drafts awaiting source action
- **In transit** — dispatched goods with age and expected arrival
- **To receive** — destination confirmation queue
- **History & reconciliation** — completed, discrepant and cancelled transfers

The transfer form will support scanning/searching items, lot selection, available-stock checks, expected tax preview and invoice totals. The receipt screen will compare sent versus received quantities line by line and require notes/evidence for differences. Printable invoice, e-way bill reference sheet and GRN will be available from the transfer detail view.

Stock Ledger and Inventory views will show paired **Transfer out**, **In transit**, and **Transfer in** movements without affecting sales or purchase KPIs. Reorder logic will treat source stock as unavailable at dispatch and destination stock as available only after receipt.

## 7. Period close and audit controls

- Dispatch date determines the GST tax period; receipt may occur in a later period.
- Closed periods cannot accept backdated dispatches or receipts.
- Goods in transit is reported separately by source, destination, age and cost, including year-end cut-off.
- Monthly reconciliation compares transfer invoices, output GST, destination ITC, e-way bills, receipts, discrepancies and inter-branch balances.
- Records and document snapshots remain searchable for the statutory retention period; cancellation never deletes history.
- Existing financial-year snapshots will be extended to include open goods in transit and transfer-related balances.

## 8. Delivery phases

1. **Accounting-policy sign-off** — accountant confirms legal entity/PAN relationships, full-ITC eligibility, valuation fallback, GST rates/HSN ownership, invoice series, e-invoice applicability, state e-way thresholds, title-transfer point, freight treatment, loss/ITC-reversal rules and period-close policy.
2. **Masters and cost foundation** — store tax profiles, shared product mapping, lot-level actual costs, migration review and opening-cost reconciliation.
3. **Core transfer engine** — secure draft/dispatch/receipt RPCs, atomic stock movement, GIT and discrepancy handling.
4. **GST documents and journals** — invoices, tax calculations, journal posting, branch balances and elimination report.
5. **Inventory Hub experience** — queues, transfer form, receipt screen, printable documents and ledger integration.
6. **Verification and rollout** — accountant-approved test cases, pilot with two stores, opening-stock reconciliation, permission testing, then enable remaining stores.

## Acceptance tests

- Dispatch of 2 units reduces only the selected source lots and creates exactly 2 units in transit; destination stock remains unchanged.
- Receipt of 2 units clears transit and adds the same actual-cost layers to the destination exactly once.
- A shortage/damage receipt never inflates stock and cannot disappear without an approved resolution and tax treatment.
- Interstate and intrastate store pairs calculate the correct IGST versus CGST/SGST structure.
- Users without source access cannot dispatch; users without destination access cannot receive; dispatcher cannot receive their own transfer.
- Concurrent dispatches cannot take stock below zero.
- Transfer records never affect customer sales, supplier purchases, cash, sales KPIs or demand history.
- Journals balance by GST registration and inter-branch accounts eliminate to zero when both sides are complete.
- March dispatch/April receipt remains in the correct GST period and appears as goods in transit at year-end.
- Cancel, retry and duplicate requests cannot duplicate quantities, invoices or journal entries.

## Explicitly outside the first release

Automatic GST portal/e-invoice/e-way-bill submission, transporter integrations, inter-company transfers between different PANs, and material/BOM transfers. These can be added after the inter-GSTIN branch workflow is reconciled successfully.

## Compliance note

This design follows the distinct-person supply principle, Rule 28 valuation framework, e-way bill controls and normal inventory accounting. Final configuration must be approved by the company’s Chartered Accountant/GST adviser because ITC eligibility, state notifications, e-invoicing thresholds and loss treatment depend on the registrations and facts of each transfer.
