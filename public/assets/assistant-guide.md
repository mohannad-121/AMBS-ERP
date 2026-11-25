# AMBS Production System — User Guide

The AMBS Production System is the production planning and stock control web app of AM Building Solutions DWC LLC. It keeps the master data (customers, suppliers, processing companies, raw materials, parts, products and their Bills of Materials). It also runs the daily operations: production plans and orders, purchasing and supplier receipts, stock transfers, adjustments and counts, and packing and dispatch to customer sites. Stock is held per **custody location**, and every stock change is a permanent entry in the movement ledger. The app also includes engineering tools: a steel weight calculator, a market sections catalogue, a product take-off calculator and bar/plate nesting. This guide explains every page, form, status and common error message.

## What changed in November 2026 (owner requests) 🆕
Keywords: vendor, supplier renamed, driver, delivery, trip, papers, tracking, live, excel, phone +971, required

- **Nothing is marked "Required"** any more. Empty codes are filled in automatically (C-001 customers, V-001 vendors, RM-0001 raw materials, PT-001 parts, PR-001 products). A save only stops when something truly cannot work, for example a record without a name.
- **Customers** need only: **Name**, **Code**, **Phone number**, **Position** and **Delivery address**. The phone box already shows **+971**; type the rest, e.g. `50 123 4567`. The delivery address is also kept as the customer's "Delivery address" site for dispatch.
- **Suppliers are now called Vendors**. Same short form (name, code, phone, position, address) plus **Materials this vendor supplies**: pick a raw material and the number of **bundles**. Click **View** on a vendor to see its materials, bundles, units per bundle and stock on hand.
- **Raw materials**: the form starts with **Material name**. Safety / minimum stock and the Archive button were removed.
- **Bills of Materials**: **Create BOM** has a search box — type part of a name or code. Each BOM has a **View** button that lists what is inside. In the BOM form there is no "Add line" button: a new empty line appears by itself when the last line is filled; empty lines are ignored.
- **Drivers & Deliveries** (`#/drivers`): add drivers with phone, vehicle, licence, Emirates ID, vehicle registration and the **Official papers checked and on file** box. **A trip cannot be created, started or delivered with a driver whose papers are missing or expired.** Each trip has a packing number (PL2026-11-001), customer, project, system, short description, from / delivery location, distance in km, priority, status (Next → On the way → Delivered), delivery date and delivery paper status. Export everything with **PDF** or **Excel** (Excel has a Deliveries sheet and a Drivers sheet); each driver's View has its own PDF / Excel.
- **Live Tracking** (`#/tracking`): where every item is now, every movement with the balance left at that location, filters for item type, location, movement type and dates, a **Track** timeline per item, and an Excel export. Dashboard, Live Tracking and Drivers refresh themselves every 30 seconds.
- **Dashboard**: live KPI cards, stock movements over 14 days, deliveries by status and per driver, where stock is held, most moved items, the live movement feed and deliveries to watch.

## Navigating the app (sidebar and pages)
Keywords: menu, sidebar, navigation, pages, where is, find page, القائمة, صفحة

The left sidebar has five groups:

1. **Overview**: **Dashboard** (`#/dashboard`), **Live Tracking** (`#/tracking`).
2. **Contacts & Products**: **Customers** (`#/customers`), **Vendors** (`#/suppliers`, previously called Suppliers), **Products** (`#/products`), **Bills of Materials** (`#/bom`).
3. **Master Data**: **Raw Materials** (`#/materials`), **Parts** (`#/parts`), **Processing Companies** (`#/processors`).
4. **Operations**: **Sales Orders** (`#/sales`), **Production** (`#/production`), **Purchasing** (`#/purchase`), **Inventory & Stock Movements** (`#/movement`), **Packing & Dispatch** (`#/dispatch`), **Drivers & Deliveries** (`#/drivers`).
5. **System**: **Reports** (`#/reports`), **Tools** (`#/tools`), **Settings & Data** (`#/settings`).

The Tools pages (Steel Weight Calculator `#/steel`, Market Sections `#/market`, Product Calculator `#/prodcalc`, Product Nesting `#/nesting`) highlight **Tools** in the sidebar. On a narrow screen or phone, the sidebar is hidden. Open it with the menu button at the top left of the top bar. Press **Escape** or tap outside it to close it.

Most actions open a form in a pop-up window. Close a form with **Cancel**, the **×** button, a click outside it, or **Escape**.

## Top bar buttons
Keywords: top bar, Purchase button, Refresh, Sign out, clock, header, user, reload data

The top bar shows the current page title and these items, from left to right:

- 🛒 **Purchase** is a shortcut that opens a **New Purchase Request** form on the Purchasing page (`#/purchase-new`).
- **Refresh** reloads the latest saved workspace data and shows "Workspace refreshed." It refuses with "Close the current form before refreshing." while a form is open. Use it when a colleague or another browser tab has saved changes.
- In the browser workspace, a chip reads **Saved in this browser**. In the cloud workspace, a **Sign out** button appears instead.
- A clock shows the date and time.
- An avatar and the signed-in identity appear at the far right.

The sidebar footer shows the company name and either **Browser workspace** or **Cloud workspace**.

## Browser workspace vs cloud workspace
Keywords: demo mode, local, offline, browser, cloud, Supabase, where is my data saved, workspace, تجريبي

The app runs in one of two modes:

- **Browser workspace** (demo mode) stores all data only inside this browser (IndexedDB) on this computer. No sign-in is needed and you act as administrator. Data does not reach other computers, other browsers or other browser profiles. Clearing the browser's site data deletes it. Use **Settings & Data** → **Export Backup (JSON)** regularly (`#/settings`). The sidebar shows **Browser workspace** and the top bar shows **Saved in this browser**.
- **Cloud workspace** shares one company workspace through the AMBS cloud service. Users must sign in with an authorized email. The top bar shows **Sign out**.

⚠️ In the current build of the app, the mode switch is fixed to the browser workspace, so the sign-in screens do not appear. If your colleagues cannot see your data, you are probably each working in a separate browser workspace. Move data between them with backup export and import.

If the cloud service isn't configured, the app shows a **Supabase setup** message. An administrator has to fix that in the deployment.

## Sign in to AMBS (cloud workspace)
Keywords: login, sign in, log in, password, email, account, تسجيل الدخول

When the cloud workspace is active, the app opens on **Sign in to AMBS**.

1. Enter your **Email** and **Password**.
2. Click **Sign in**.

The same screen also has **Create account** and **Forgot password?**.

Your sign-in is kept for the current browser tab session. If you close the tab, you may have to sign in again. Sessions refresh automatically while you work. If a session expires, you see "Your session expired. Sign in again."

Common sign-in messages:
- "This account does not have AMBS access." means your email isn't enabled as an AMBS member. Ask the administrator.
- "Confirm your account email before signing in." means you haven't entered the confirmation code yet.
- "AMBS cloud storage is temporarily unavailable. Try again shortly." means the cloud service is down. Wait and retry.

## Create an AMBS account (first-time setup)
Keywords: sign up, register, create account, confirmation code, verify email, new user, تسجيل حساب

1. On the sign-in screen, click **Create account**.
2. Enter your authorized **Email** and a **Password** of 12 to 72 characters.
3. Click **Email me a code**.
4. Open your inbox (check Spam too) and find the AMBS confirmation code (6–8 digits).
5. Enter it in **Confirmation code** and click **Confirm and sign in**. **Start again** goes back to the first step.

Errors you might see:
- "This email is not enabled for AMBS." Only emails that an administrator has added as members can register. There is no self-service membership and no user-management screen in the app.
- "Enter your authorized email and a password of 12 to 72 characters."

If confirmation succeeds but no session is returned, the app shows "Email confirmed. Sign in with your password."

## Forgot password / reset password
Keywords: forgot password, reset password, recover, reset code, change password, نسيت كلمة السر

1. On **Sign in to AMBS**, click **Forgot password?**.
2. Enter your AMBS **Email** and click **Send reset code**.
3. Check your inbox and Spam for the reset code, enter it in **Reset code**, and click **Verify code**. **Request another code** restarts the process.
4. On **Choose a new password**, type a **New password** of 12 to 72 characters and click **Save new password**. You are signed in straight away.

If the code is wrong or expired, you see "Unable to verify the reset code. Request a new code." There is no "change password" page inside the app. Use this reset flow instead.

## Administrator vs staff permissions
Keywords: admin, staff, role, permission, access denied, not allowed, صلاحيات, مسؤول

In the cloud workspace, each member is either **admin** or **staff**. Members and roles are set by the administrator in the database, not inside the app. In the browser workspace you are always admin.

Both roles see the same pages and buttons. The server enforces these rules when you save:

- Only an **admin** can change **Company profile** settings (company name, operator name, logo and so on) or import backups that change the legacy archive. Staff get "Only an administrator can edit company settings or import the archive."
- Only an admin can initialize an empty workspace. Otherwise: "An administrator needs to initialize AMBS."
- Staff can create and edit master data and run all operations: purchasing, production, inventory and dispatch. They can also save Product Calculator take-offs.
- Nobody can change or delete posted stock movements: "Existing stock movements cannot be changed or removed."

## Dashboard overview 📊
Keywords: dashboard, home, overview, KPI, summary, alerts, start page, لوحة

The **Dashboard** (`#/dashboard`) is the start page.

- **KPI cards** show active counts of Customers, Suppliers, Processing Companies, Raw Materials, Parts and Products. **Open Production Orders** counts orders in Draft or Released. **Stock Warnings** counts safety-stock and reserved shortages. Click any card to open that page. Stock Warnings opens **Reports**.
- **View Stock** (top right) opens **Inventory & Stock Movements**.
- **Raw material stock by category** totals balances per category and unit across all locations.
- **Part stock by category and location** does the same for parts.
- **Finished product and variant stock** lists the balance of each product and variant per custody location.
- **Production status** counts Draft, Released, Completed and Cancelled orders.
- **Stock alerts** lists materials below safety stock and reserved demand shortages.
- **Recent stock movements** shows the last 8 ledger entries.

A yellow note says "Legacy data is available under Settings & Data for review." when old imported records still need review.

## Searching lists and picking records in forms
Keywords: search, filter, find record, picker, dropdown, typo, بحث

- **List search**: most lists (materials, parts, products, companies, BOMs, dispatch, stock) have a search box at the top, such as "Search by name, code or size…". It matches code, name, category, size and color. It tolerates small typos and splits letters from numbers, so "shs50" finds "SHS 50". The counter on the right shows how many records match.
- **Searchable pickers** in forms (for example **Item / SKU**, **Product**, **Supplier**, **Raw Material**): click the box to see all choices, type to narrow them, then click one. Arrow-down moves into the list and Enter picks the only match. If you type but don't click a choice, the field stays empty and the form reports a missing selection.
- **"No matching records"** means nothing active matches. Archived records don't appear in pickers.

## Add a customer, supplier or processing company 🏢
Keywords: add customer, new supplier, processor, vendor, client, company, contact, TRN, VAT, tags, payment terms, credit limit, logo, عميل, مورد, شركة, زبون

1. Open **Customers** (`#/customers`), **Suppliers** (`#/suppliers`) or **Processing Companies** (`#/processors`) from the sidebar group **Overview**.
2. Click **Add Customer**, **Add Supplier** or **Add Processing Company** (top right). The form has tabs:
   - **General**: **Code** and **Name** (required; codes must be unique per company type), **TRN / VAT number (optional)**, **Tags (comma separated)** such as "VIP, Contractor", **Email**, **Phone**, **Website**, **Business / Supply details** (processing companies: **Services (comma separated)**), **Address**, **City / emirate**, **Country** and a **Logo**.
   - **Contacts**: click **Add Contact** for each person (**Name**, **Job title**, **Phone**, **Email**). The first contact is shown as the main contact person in lists.
   - **Locations**: click **Add Location** to add sites (see "Add company locations (sites)").
   - **Sales & payment** (customers), **Purchasing & payment** (suppliers) or **Terms** (processing companies): **Payment terms** (e.g. 30 days), **Credit limit (AED, optional)** for customers or **Typical lead time (days, optional)** for suppliers and processors, and an **Account manager / salesperson** or **Buyer / account manager**.
   - **Notes**.
3. Click **Save**. If a required field on another tab is empty, the form jumps to that tab.

The list shows the logo (or initials), name, tags, main contact person, phone, number of locations and how many open orders the company has.

## Customer, supplier and processor page (smart buttons)
Keywords: customer page, customer profile, customer details, smart buttons, customer history, supplier page, open orders of customer, credit limit warning, صفحة العميل, ملف العميل

Click **View** on a company to open its page:

- **Header**: logo, name, code, type, status and tags.
- **Smart buttons** with live numbers. Click one to jump to its section:
  - Customers: **Sales orders**, **Ordered value**, **Deliveries**, **Dispatch jobs**
  - Suppliers: **Purchases**, **Receipts**, **Items supplied**
  - Processing companies: **Production orders**
  - All: **Stock at sites**, **Contacts**, **Locations**
- **Details**: TRN, email and phone (click to email or call), website, address, payment terms, credit limit or lead time, account manager.
- Sections listing the company's contacts, locations, sales orders, dispatch jobs, purchases, production orders, stock held at its sites and recent stock movements, each with **View** buttons.

If a customer's open sales orders are worth more than its **Credit limit**, the page shows a warning and an **Over limit** badge. The limit is a reminder only; it doesn't block orders. Click **Edit** at the bottom to change the company.

## Add company locations (sites) 📍
Keywords: site, location, address, project site, delivery site, Google Maps, latitude, longitude, موقع, عنوان

Company sites are added inside the company record:

1. Open the customer, supplier or processing company and click **Edit**, or create a new one.
2. Under **Company locations**, click **Add Location**.
3. Fill **Location name** (required, and unique within that company). Optionally add **City / emirate**, **Address**, **Google Maps URL**, **Latitude**, **Longitude** and **Location notes**.
4. Tick **Use as AMBS stock custody location** only if AMBS stock will be physically held there and tracked.
5. Click **Save**.

**Google Maps URL** must be an HTTPS Google Maps link (google.com/maps, maps.google…, or maps.app.goo.gl). Otherwise you see "Enter a valid HTTPS Google Maps link." Latitude and longitude must be entered together: "Enter both latitude and longitude in range." A location with a map link or coordinates shows an **Open in Google Maps** button.

To remove a site, click **Remove line** on it and save. The site is archived, which is blocked if stock or open operations use it: "This location is used by stock or an open operation."

## What is a custody location?
Keywords: custody location, warehouse, store, stock location, where stock is, مخزن, موقع المخزون, مستودع

A **custody location** is a place where AMBS stock is counted. Every balance in the app is per item **and** per custody location. Purchases are received into one, production consumes and produces at one, and dispatch ships from one.

There are two kinds:
1. **AMBS's own locations**, such as a factory, store or yard. Add them in **Settings & Data** → **Add Custody Location** (`#/settings`). They always count as custody locations.
2. **Company sites** (customer, supplier or processor locations). They count only when **Use as AMBS stock custody location** is ticked in that company's record. Example: AMBS stock kept at a customer's project site.

Only active custody locations appear in **Receiving custody location**, **Production location**, **Fabrication location**, **Source custody location**, **From location** / **To location** and **Custody location** fields. Sites of an archived company drop out of these lists.

## Add an AMBS custody location (warehouse / store)
Keywords: add location, new warehouse, add store, factory, custody, Settings, مخزن جديد, موقع

1. Open **Settings & Data** (`#/settings`) from the sidebar group **System**.
2. Click **Add Custody Location** (top right).
3. Enter **Location name** (required, and unique among AMBS's own locations). Optionally add **City / emirate**, **Address**, **Google Maps URL**, **Latitude**, **Longitude** and **Location notes**.
4. Click **Save**.

The location appears in the **Locations** table with Company "AMBS" and is immediately available in every custody location dropdown. There is no tick box here because AMBS's own locations are always stock custody locations.

If the name already exists, you see "This location name is already in use."

## Why is the custody location list empty?
Keywords: custody location empty, no locations, dropdown empty, can't select location, location missing, لا يوجد موقع, القائمة فارغة

If a **Custody location**, **Receiving custody location**, **Production location**, **Fabrication location** or **From/To location** dropdown is empty or is missing a site, check these points:

1. **No AMBS location exists yet.** Go to **Settings & Data** → **Add Custody Location** (`#/settings`) and create one, for example "Main Store".
2. **The site belongs to a company but isn't marked for custody.** Open the customer, supplier or processor, click **Edit**, and tick **Use as AMBS stock custody location** on that site. Save.
3. **The location is archived.** In **Settings & Data** → **Locations**, check its Status and click **Restore** for an AMBS location. A company site removed in its company form becomes archived. Add it again in the company record.
4. **The owning company is archived.** Restore the company.
5. **You are in a different workspace or browser.** Data in the browser workspace is per browser. Click **Refresh** or check the workspace mode.

Note that **Customer delivery site** in dispatch is different: it lists all active sites of the chosen customer, whether or not they hold stock.

## Make a customer site hold AMBS stock
Keywords: customer site stock, consignment, stock at site, track at customer, custody at customer, مخزون عند العميل

To keep AMBS stock tracked at a customer's site, for example materials left on a project:

1. Open **Customers** (`#/customers`), find the customer and click **Edit**.
2. Under **Company locations**, find the site, or click **Add Location** to create it.
3. Tick **Use as AMBS stock custody location**.
4. Click **Save**.

The site now appears in custody dropdowns as "Customer name / Site name". You can then:
- **Transfer Stock** to it on **Inventory & Stock Movements**.
- Tick **Keep delivered stock tracked at customer site** on a dispatch job.

You can't untick custody on a site that still has a balance or open operations: "This location is used by stock or an open operation." Move or reconcile the stock first.

## Edit, archive, restore or delete a location
Keywords: edit location, archive location, delete location, rename warehouse, remove site, حذف موقع

Go to **Settings & Data** → **Locations** (`#/settings`). Every location, both AMBS and company sites, is listed with these actions:

- **View** shows company, address, custody flag, current stock, linked operations and recent movements.
- **Open in Google Maps** appears when a map link or coordinates exist.
- **Edit** (AMBS locations) opens the location form. For company sites, the button is **Edit company** and opens the company record. "Edit company locations from their company record."
- **Archive** / **Restore** (AMBS locations) removes the location from new selections or brings it back. Archiving is blocked while it has a balance or open plans, orders, purchases or dispatch jobs: "Resolve balance and open operations at this location first."
- **Delete** removes it permanently. This works only if nothing references the location: "This location is used elsewhere. Remove its links first, or archive it."

## Add a raw material 📦
Keywords: add raw material, new material, steel, tube, sheet, aluminium, stock item, مادة خام, إضافة مادة

1. Open **Raw Materials** (`#/materials`) in **Master Data**.
2. Click **Add raw material** (top right).
3. **Code** is pre-filled with the next free code (RM-0001, RM-0002 …). You can change it, but it must be unique across materials, parts, products and variants.
4. Fill **Material name *** and optionally **Category** (suggestions: Tubes, Steel sections, Sheets, Accessories).
5. Choose **Unit**, for example PCS, M, KG or TUBE.
6. Optionally fill **Bundle quantity (units per bundle)**, **Safety / minimum stock**, **Opening / initial stock** (see the next section), **Section profile (links to calculators)**, **Stock length (m)**, **Rate (AED per kg)**, **Rate (AED per piece)**, **Dimensions / specifications**, **Image** and **Notes**.
7. Keep **Active (available for planning and movements)** ticked.
8. Click **Save material**.

The material is now available for Part BOMs, purchase requests and stock movements.

## Opening stock for a new raw material
Keywords: opening stock, initial stock, starting balance, first stock, رصيد افتتاحي

You can post an opening balance only while **creating** a raw material:

1. In **Add raw material**, enter **Opening / initial stock** greater than 0.
2. The **Opening stock custody location** field appears. Choose where the stock physically is.
3. Click **Save material**. An "Opening stock" movement is posted to the ledger.

Rules and messages:
- "Choose a custody location for opening stock." appears if you leave the location empty. If the list is empty, add a location first. See "Why is the custody location list empty?".
- "Activate the material before posting opening stock." appears if **Active** is unticked.
- For count units such as PCS, the quantity must be whole: "Opening stock must be a whole number."

After saving, the field is read-only. Later corrections use **Inventory & Stock Movements** → **Stock Check** or **Stock Adjustment** (`#/movement`). For opening stock of parts, products or variants, use **Stock Adjustment** or **Stock Check**.

## Raw Materials list columns and stock status
Keywords: on hand, safety stock, low stock, watch, on order, available after, material status, min stock, نقص المخزون

The **Raw Materials** table (`#/materials`) shows these columns:

- **Opening**: the opening stock that was posted.
- **On hand**: the physical balance across **all** custody locations.
- **Safety**: the safety or minimum stock you set.
- **Bundle**: the units per bundle.
- **On order**: unreceived quantities on purchase requests in status Ordered.
- **Avail. after**: On hand plus On order.
- **Status**: **Low** (red) when on hand is below safety, **Watch** (amber) when it is within 125% of safety, otherwise **OK**. With safety 0 it is always OK.
- **State**: Active or Archived.

Actions are **View**, **Edit**, **Archive**/**Restore** and **Delete**. **Stock report** (top right) opens **Reports**. Materials below safety stock also appear in **Stock alerts** on the Dashboard and in **Shortages and safety stock** on Reports.

## Units of measure
Keywords: unit, UOM, PCS, KG, meter, M², unit error, وحدة

Standard units: PCS, TUBE, SHEET, SET, M, M², M³, MM, KG, G, T, L, ROLL, BOX, PACK, PAIR, BUNDLE. You can type another unit using capital letters, numbers, spaces, / or - (up to 24 characters). Otherwise you see "Enter a stock unit using letters, numbers, spaces, / or -." Typing M2 or M3 becomes M² or M³.

- **Measured units** (M, M², M³, MM, KG, G, T, L) accept decimals.
- **Count units** (PCS, SET, TUBE …) need whole numbers for parts, variants and products: "Use a whole quantity for parts, variants and products."

You cannot change a unit once the item is used in a BOM, variant, purchase, order, dispatch or stock movement: "This unit is used in a BOM, variant or operational record." A Part BOM line must use the raw material's own unit.

## Add a part (manufactured, purchased or stocked)
Keywords: add part, component, new part, manufactured, purchased, stocked, part source, قطعة, مكون

1. Open **Parts** (`#/parts`) in **Master Data** and click **Add Part**.
2. Fill **Code** and **Name** (required, unique). Optionally add **Category** (suggestions: Safety net, Aluminium, Steel / fabricated parts, Fasteners / accessories).
3. Set **Stock unit**, optionally **Dimensions / specifications**, then **Part source**:
   - **Manufactured**: made by AMBS from raw materials. It needs an approved Part BOM, and it is the only source allowed in production orders.
   - **Purchased**: bought from suppliers. It can be on purchase requests and needs no BOM.
   - **Stocked**: an item simply held in stock. It can also be purchased and needs no BOM.
4. Optionally add **Image** and **Notes**, then click **Save**.

The Parts list shows **Quantity on hand** (including variant stock) with actions **View**, **Edit**, **Variants**, **BOM**, **Archive**/**Restore** and **Delete**. You can't change the source while draft or released production orders use the part: "Close open production orders before changing this part’s source."

## Part variants (size / color SKUs)
Keywords: variant, size, color, SKU, yellow, red, net size, مقاس, لون

Use variants when one part comes in several sizes or colors that are stocked separately, for example nets 4.5 × 3.1 m in Yellow and Red.

1. In **Parts** (`#/parts`), click **Variants** on the part.
2. Click **Add Variant**.
3. Enter **SKU** (a unique code) and **Name**, optionally **Size** (suggestions include 4.5 × 3.1 m, 6.5 × 3.1 m, 4 × 4.5 m, 6.5 × 4.5 m and 6.5 × 12 m), **Color** (Yellow or Red suggested) and **Image**.
4. Click **Save**.

Important rules:
- Once a part has variants, stock is kept **per variant**. The generic part can no longer be moved: "Select an active stock SKU. Parts with variants use the specific variant SKU."
- The generic part's balance must be zero first: "Reconcile generic stock for this part before enabling variant stock."
- Open operations on the generic part must be closed: "Close open operations using the generic part SKU before adding variants."
- A variant takes its unit from the parent part.
- To archive a part, archive its variants first: "Archive this part’s variants first."

## Packing list parts that appear automatically
Keywords: PK parts, workbook parts, NET-STD, automatic parts, packing list, why parts exist, أجزاء تلقائية

The app includes the AMBS packing-list workbook, with safety nets, aluminium rounds, ropes, clips and other accessories. When a workspace starts, and when an administrator's session connects, any missing workbook item is added to **Parts** automatically. Each one gets source **Stocked**, its photo, and a code:
- Safety nets get codes like **NET-STD-4.5X3.1-Y** or **NET-MAXI-6.5X4.5-R** with category "Safety Net".
- Other accessories get **PK-001**, **PK-002** … with category "Packing list".

If you **Delete** one of these parts, the app remembers it and won't add it back. If you enter a quantity for a workbook item with no matching part when saving a product, a new "Packing list" part with a PK- code is created automatically.

## Add a finished product 🧩
Keywords: add product, finished product, safety net system, product setup, new product, منتج, إضافة منتج

1. Open **Products** (`#/products`) in **Master Data** and click **Add Product**.
2. Fill **Code** and **Name** (required, unique).
3. Choose or type **Category / packing formula template**. Picking a template such as **4.0 STD-Y** fills in the part quantities automatically (see the next section).
4. Set **Stock unit** (usually PCS) and **Default order quantity**, a whole number used as the default quantity on new dispatch jobs.
5. Optionally add an **Image** and **Notes**.
6. In **Product parts**, search parts by name or code and enter **Quantity per product**. **Order total** shows quantity × default order quantity. **Workbook accessory cost estimate** (expandable) shows workbook costs where available.
7. Click **Save**.

Saving with part quantities creates or updates the product's **Product BOM**, which is approved by default. A product needs a Product BOM before you can plan or dispatch it.

## Packing formula templates (4.0 STD-Y, MAXI, VERTICAL NET)
Keywords: packing category, template, 4.0 STD-Y, 6.0 STD-R, MAXI, vertical net, formula, packing list, قالب

The **Category / packing formula template** field on a product offers the workbook templates:
**4.0 STD-Y**, **6.0 STD-Y**, **4.0 STD-R**, **6.0 STD-R**, **STD-Y**, **STD-R**, **4.0 MAXI-Y**, **6.0 MAXI-Y**, **4.0 MAXI R**, **6.0 MAXI-R**, **MAXI-Y**, **MAXI-R** and **VERTICAL NET**. Y means yellow nets, R means red nets, and 4.0 or 6.0 is the system size.

How it works:
1. Choosing a template resets all part quantities, then fills each workbook row. For example, 4.0 STD-Y starts with one STD 4.5 × 3.1 m yellow net plus the aluminium rounds and accessories.
2. The two **net** rows act as inputs. When you change a net quantity, the dependent rows are recalculated. For example, horizontal aluminium rounds = nets × 2.
3. You can still edit any quantity by hand before saving.

Product **View** shows the template **Type** (STD, MAXI or VERTICAL NET). Templates only fill quantities, and the saved Product BOM is what operations use.

## Add or change a picture (image) 🖼️
Keywords: image, picture, photo, upload, logo, change image, remove image, صورة, رفع صورة

Raw materials, parts, products, variants, customers, suppliers, processing companies (as a logo) and the company profile logo can have a picture. Locations cannot.

1. Open the record's **Edit** form (or **Add …**).
2. In **Image**, choose a file. A preview appears.
3. Click **Save**. The image is resized and compressed automatically.

To delete a saved picture, tick **Remove saved image** and save. Choosing a new file replaces the old one.

Allowed: PNG, JPEG, WebP or GIF up to 10 MB ("Choose a PNG, JPEG, WebP or GIF under 10 MB."). Errors:
- "Image must be 10 MB or smaller."
- "Use a PNG, JPEG, WebP or GIF image."
- "The image could not be opened."
- "This image is too detailed to save. Choose a smaller image."

Pictures appear as thumbnails in lists, in **View** windows and in the product parts table. Records without one show a box icon. The company logo appears on PDF headers.

## Enlarge a picture (image viewer)
Keywords: zoom image, enlarge photo, view picture big, full size, lightbox, تكبير الصورة

Click any thumbnail picture in a list, a **View** window or the product parts table. It opens enlarged in the centre of the screen with its name as a caption.

To close it, click the **×** button, click anywhere outside the picture, or press **Escape**. The placeholder box icon shown for records without a picture does not open.

## View a record and its linked information
Keywords: view, details, history, linked operations, where used, record details, تفاصيل

Click **View** on any master record:

- The picture, status, category, specifications, unit, source and contact details.
- **Linked locations** for companies, with **Open in Google Maps**.
- **Product parts** for products.
- **Stock by location** (or **Stock at linked sites** for companies): the current balances.
- **Linked operations**: production plans, orders, purchases and dispatch jobs that use the record, each with a **View** button.
- **Used in BOMs**: for raw materials, the Part BOMs that use them; for parts, the Product BOMs. Each has an **Open BOM** button.
- **Recent linked stock movements**: the last 15.

Operation views (plans, orders, purchases, dispatch, stock events) have a **Download PDF** button.

## Archive, restore or delete master records
Keywords: archive, deactivate, restore, delete, remove, inactive, أرشفة, حذف

**Archive** keeps history but hides the record from new selections. **Delete** removes it permanently.

- **Archive** (on customers, suppliers, processors, materials, parts, products and variants) is blocked when:
  - the item still has stock: "Move, consume or reconcile remaining stock before archiving this SKU."
  - it is in an approved active BOM: "Remove this item from active BOMs before archiving it."
  - it is in an open plan, order, purchase or dispatch: "This record is used in an open operation."
  - a part still has active variants: "Archive this part’s variants first."
  - a company's custody sites hold stock: "Resolve stock or open operations at this company’s custody sites first."
  - a customer has open dispatch jobs: "Close this customer’s open dispatch jobs first."
- **Restore** brings it back. For raw materials you can also untick **Active** in Edit.
- **Delete** only works if nothing references the record: "This record is used elsewhere. Remove its links first, or archive it."

## Bill of Materials page (BOM) 🧾
Keywords: BOM, bill of materials, recipe, formula, structure, قائمة المواد

The **Bill of Materials** page (`#/bom`) lists every part and product with **Recipe type**, **Sizes**, **Colors**, **Lines** and **Status**.

There are two levels of BOM:
- **Part → Raw Materials** (Part BOM): how much raw material one manufactured part consumes.
- **Product → Parts** (Product BOM): how many of each part make one complete product.

Status values:
- **Approved**: ready for operations.
- **Review required**: saved but not approved, or a legacy recipe. Operations refuse it.
- **Missing**: no BOM yet.

Use **Create BOM** (top right) and pick the part or product, or click **Create BOM** / **Edit BOM** on a row. **Delete BOM** removes only the recipe. You can also open BOMs from **Parts** or **Products** with the **BOM** button.

Purchased and Stocked parts don't need a Part BOM. Manufactured parts do.

## Create a Part BOM (raw material consumption)
Keywords: part BOM, consumption formula, wastage, material usage, recipe for part, معادلة الاستهلاك, هدر

1. On **Bill of Materials** (`#/bom`), click **Create BOM**, choose the part and click **Continue**. Alternatively, click **BOM** on the part in **Parts**.
2. For each **Raw material line**:
   - pick the **Raw Material**. **Unit** fills in from the material's stock unit and must stay the same.
   - enter the **Consumption formula** per **one** part, for example `1/10 + 1/30` or `0.25*4`.
   - enter **Wastage %** (0–100) and optional **Line notes**.
3. Below each line, the app previews "Evaluated X · including wastage Y".
4. Use **Add Line** for more materials and **Remove line** to drop one.
5. Keep **Approve for operational use** ticked.
6. Click **Create BOM** or **Save BOM**.

Required quantity = formula result × (1 + wastage%/100) × quantity produced. If you see "Approve the Part BOM for … first.", open the BOM, tick **Approve for operational use** and save.

## BOM formula rules and errors
Keywords: formula error, invalid formula, division by zero, parenthesis, wastage error, خطأ المعادلة

Consumption formulas accept only numbers, + − * /, decimal points and parentheses. Up to 240 characters are allowed. Units and letters are not.

Error messages:
- "Enter a formula (maximum 240 characters)." The formula is empty or too long.
- "Use only numbers and +, −, *, /, parentheses." Remove letters, units or other symbols.
- "Missing closing parenthesis."
- "Division by zero."
- "Unexpected formula input." There is extra text, for example two numbers with no operator.
- "Formula result must be finite and nonnegative."
- "Material usage must be greater than zero." A result of 0 isn't allowed.
- "Wastage must be within 0–100%."
- "The BOM line unit must match the raw material stock unit."
- "Add at least one BOM line."
- "This BOM changed in another tab. Reopen it to edit."

## Create a Product BOM (parts per product)
Keywords: product BOM, parts list, product recipe, components per product, kit, مكونات المنتج

There are two ways to set it up:
- **Through the product form**: enter **Quantity per product** in **Product parts** and save. See "Add a finished product".
- **Through the BOM page**: on **Bill of Materials** (`#/bom`), click **Create BOM** or **Edit BOM** on the product.

In the BOM form, each **Part line** has:
1. **Part**: pick from the parts list.
2. **Quantity per product**: whole numbers for count units, decimals for measured units.
3. **Size / color SKU**: optional. Choose a fixed variant, or leave "Select during planning / dispatch" to choose it later.

Click **Add Line** for more parts, tick **Approve for operational use**, then **Create BOM** / **Save BOM**.

Rules:
- "Use one Product BOM line per part and size / color SKU."
- "Choose a size / color SKU belonging to this part."
- Without an approved Product BOM, plans and dispatch show "Save the Product BOM for … first."

## Production page overview 🏭
Keywords: production, manufacturing, plan, order, MO, fabrication, إنتاج, تصنيع

The **Production** page (`#/production`) has two tables:

- **Production orders** (numbers start with **MO-**): actually manufacture a **Manufactured part** or one of its variants. Completing an order consumes raw materials and adds the part to stock.
- **Production plans** (numbers start with **PLAN-**): plan finished products. A plan explodes products → parts → raw materials, compares demand with stock and can **reserve** raw material demand. A plan never moves physical stock.

Buttons at the top right are **New Production Plan** and **Create Production Order**. You can also open a new plan directly with `#/plan-new`.

Production orders make **parts**, not finished products. See "How do I get finished product stock?".

## Create a production plan
Keywords: production plan, plan products, material requirement, MRP, demand, خطة إنتاج

1. On **Production** (`#/production`), click **New Production Plan**.
2. Fill **Reference / project** (required) and choose a **Production location** (a custody location).
3. Optionally choose **Customer (optional)** and **Customer site (optional)**.
4. In each **Product line**, choose a **Product** and the **Requested product quantity** (whole number). The product's parts appear with **Standard quantity**, an editable **Adjusted quantity** and, for parts with variants, a required **Part variant**.
5. Click **Add Product** for more lines.
6. Review the live panels:
   - **Required parts**.
   - **Consolidated raw material demand**: Required, Physical, Reserved elsewhere, Pending purchases and Shortage.
   - **BOM trace**: which part needs which material, with formula and wastage.
7. Click **Save Plan**. The plan is saved as **Draft**.

Errors include "Enter a plan name.", "Add at least one product.", "Save the Product BOM for … first." and "Approve the Part BOM for … first."

## Production plan statuses (Draft, Reserved, Closed)
Keywords: plan status, reserve, close reservation, draft plan, حجز

- **Draft**: saved, with no effect on availability. Actions: **View**, **Edit**, **Reserve**, **Delete**.
- **Reserved**: click **Reserve** → **Confirm** ("Record the saved material requirements as reserved planning demand. Physical stock stays the same."). The plan's raw materials now count as **Reserved elsewhere** for other plans and orders at the same location. They also produce **Reserved demand shortage** alerts when stock is short.
- **Closed**: click **Close reservation** → **Confirm** to release the reservation. This is the final state.

**View** shows products, parts, consolidated raw materials and the BOM trace, plus **Download PDF**. Closing a plan does not consume stock or produce anything. Actual production happens through production orders. If someone changed the plan meanwhile, you see "This plan status has changed." Click **Refresh** and try again.

## Create a production order (manufacture a part)
Keywords: production order, manufacture part, work order, MO, fabrication order, أمر إنتاج

1. On **Production** (`#/production`), click **Create Production Order**.
2. Pick the **Part to manufacture**. Only active parts with source **Manufactured** are listed.
3. Enter **Quantity to manufacture** (whole number) and choose the **Fabrication location**. Materials are consumed there and the finished part is received there.
4. If the part has variants, choose the **Part variant**.
5. Optionally add **Customer (optional)**, **Customer site (optional)**, **Processing company (optional)**, **Processing site (optional)** and **Notes**.
6. Check the **Required raw materials** preview for shortages.
7. Click **Save Draft**.

The order needs an approved Part BOM ("Approve the Part BOM for … first."). "Choose a manufactured part." appears if the part's source isn't Manufactured. You can also start an order from the **Transfer Stock** form. When you try to transfer more of a manufactured part than is available, it offers **Create Production Order**.

## Production order statuses (Draft → Released → Completed)
Keywords: release order, complete order, cancel order, order status, confirm completion, إكمال الإنتاج

- **Draft**: editable. Actions: **View**, **Edit**, **Release**, **Cancel**, **Delete**.
- **Released**: click **Release** → **Release** ("Reserve the raw materials for this order. Physical balances stay the same."). The materials count as reserved at the fabrication location.
- **Completed**: click **Complete** → **Confirm completion**. The app posts a "Production completion" movement. It **deducts** the BOM raw materials and **adds** the manufactured part (or variant) at the fabrication location. If any material is short, completion is refused with "Insufficient stock for …". Completed orders can't be edited or deleted.
- **Cancelled**: **Cancel** → **Cancel order** from Draft or Released. This releases the requirement without any stock change.

"The order already changed status." means someone else acted first. Click **Refresh**. **View** shows the requirements, the BOM trace and **Download PDF**.

## Reading the raw material requirement table
Keywords: shortage, covered, reserved elsewhere, pending purchases, physical, requirement table, نقص

Plans and production orders show a table with one row per raw material **at the chosen location**:

- **Required**: the quantity this plan or order needs, including wastage.
- **Physical**: the current balance at that location.
- **Reserved elsewhere**: quantities held by other **Released** orders and **Reserved** plans at the same location.
- **Pending purchases**: unreceived quantities on **Ordered** purchase requests delivering to that location.
- **Shortage**: Required − (Physical − Reserved elsewhere), shown in red. **Covered** (green) means enough is free.

Pending purchases are shown for information but do not reduce the shortage. Stock at other locations doesn't count. Move it there first with **Transfer Stock**, or buy it with a purchase request.

## Create a purchase request 🛒
Keywords: purchase, buy, purchase request, PR, order material, supplier order, شراء, طلب شراء

1. Open **Purchasing** (`#/purchase`) and click **New Purchase Request**, or use the **Purchase** button in the top bar.
2. Choose the **Supplier** and optionally the **Supplier site (optional)**.
3. Choose the **Receiving custody location** where the goods will arrive.
4. Optionally add **Reference / notes**.
5. In each **Purchase line**, pick a **Raw Material or purchased SKU** and enter the **Ordered quantity**. Only raw materials and parts or variants with source **Purchased** or **Stocked** are listed.
6. Click **Add Line** for more items. Use one line per SKU.
7. Click **Save**. The request is saved as **Draft** with a number starting **PR-**.

Errors:
- "Add at least one line and use one line per SKU."
- "Choose a raw material or a purchased or stocked component."
- "Quantity must be greater than zero."
- "Purchased component quantity must be a whole number." (count units)

## Purchase request statuses
Keywords: purchase status, mark ordered, partially received, received, cancel purchase, حالة الشراء

- **Draft**: actions **View**, **Edit**, **Mark Ordered**, **Cancel**, **Delete**.
- **Ordered**: click **Mark Ordered** → **Confirm**. Quantities now show as **On order** on Raw Materials and as **Pending purchases** in requirement tables. Actions: **Record Receipt** and **Cancel**.
- **Partially received**: shown while Ordered with some quantity received. **Edit** and **Delete** disappear after the first receipt.
- **Received**: set automatically when every line is fully received.
- **Cancelled**: from Draft or Ordered ("Cancel the unreceived requirement. Received stock remains in the ledger.").

"This purchase status has changed." means another user or tab already changed it. **View** shows Ordered, Received and Outstanding per line, the receipts, and **Download PDF**.

## Receive goods from a supplier (record receipt) ✅
Keywords: receive, receipt, goods received, GRN, delivery note, supplier delivery, استلام, استلام بضاعة

1. On **Purchasing** (`#/purchase`), find the request in status **Ordered** and click **Record Receipt**.
2. The form **Supplier Receipt · PR-…** shows "Receiving into [location]".
3. Enter **Delivery note / reference** (required, and unique for this purchase).
4. For each line, enter the received quantity. The label shows the outstanding quantity. Leave 0 for items not delivered.
5. Click **Confirm Receipt**.

A "Supplier receipt" movement adds the stock at the receiving location. When everything is received, the status becomes **Received**. Partial receipts can be repeated with new references.

Errors:
- "Mark this request ordered before confirming a receipt."
- "Receipt exceeds the outstanding quantity for …"
- "Enter a received quantity." (all lines are 0)
- "Enter a receipt reference."
- "This purchase already has a receipt with that reference."
- "Received component quantity must be a whole number."

## Inventory & Stock Movements page
Keywords: inventory, stock, balance, stock movements, ledger, where is stock, مخزون, رصيد, حركة المخزون

**Inventory & Stock Movements** (`#/movement`) is the stock control centre:

- The top table lists every **Item / SKU** with its **Custody location** and **Physical balance**. Only non-zero balances are shown, and the table is searchable.
- **Movement history** lists every stock event with Date, Event, Items / SKUs, Location (A → B for transfers), Change, Related company / site, Reference and **View**.

Buttons at the top right:
- **Transfer Stock**: move stock between custody locations.
- **Stock Adjustment**: add or remove stock with a reason.
- **Stock Check**: enter a physical count and the system corrects the balance.

Each form shows a live note such as "Available X at [location] · after: Y". The note turns amber when the result would be negative.

## Transfer stock between locations
Keywords: transfer, move stock, relocate, send to site, نقل مخزون, تحويل

1. On **Inventory & Stock Movements** (`#/movement`), click **Transfer Stock**.
2. Pick the **Item / SKU**. Parts with variants must use the variant SKU.
3. Choose the **From location** and **To location**. Both must be custody locations and must differ.
4. Optionally choose **Related company (optional)** and **Related company site (optional)**. A site owned by one company is linked automatically.
5. Enter **Quantity to transfer** (whole numbers for parts, variants and products) and optional **Reference / notes**.
6. Click **Confirm Transfer**.

To send stock to a customer's site, that site must be a custody location. See "Make a customer site hold AMBS stock".

Errors:
- "Choose different source and destination locations."
- "Insufficient stock for … Available …"
- "The selected stock location belongs to a different company."

If a manufactured part is short at the source, the form offers **Create Production Order**.

## Record a stock adjustment
Keywords: adjustment, write off, damage, scrap, add stock, remove stock, correct stock, تسوية, تعديل المخزون

Use an adjustment for damage, losses, found stock, or to load opening stock of parts or products.

1. On **Inventory & Stock Movements** (`#/movement`), click **Stock Adjustment**.
2. Pick the **Item / SKU** and **Custody location**.
3. Enter **Adjustment (+ or −)**: a positive number adds stock, a negative number removes it.
4. Enter **Reason for adjustment** (required).
5. Tick **I am authorized to record this adjustment**.
6. Click **Confirm Adjustment**.

Errors:
- "Confirm authorization and enter the adjustment reason."
- "Enter a nonzero adjustment."
- "Use a whole quantity for parts, variants and products."
- "Insufficient stock for …" (a balance can never go below zero)

The adjustment is recorded with the operator name from the Company profile and can't be edited afterwards. To correct a mistake, record an opposite adjustment.

## Physical stock check (stock count)
Keywords: stock count, stock take, physical count, cycle count, reconcile, inventory count, جرد

1. On **Inventory & Stock Movements** (`#/movement`), click **Stock Check**.
2. Pick the **Item / SKU** and **Custody location**. The note shows the current system balance.
3. Enter the counted quantity in **Physical count** (0 or more).
4. Enter **Reason / count reference**, for example "Monthly count Nov".
5. Click **Confirm Count**.

The app posts the difference (physical − system) as a "Physical Stock Check" event and stores both the system count and the physical count, which you can see in **View**. If the count equals the system balance, a zero-change record is still kept.

Errors:
- "Enter a stock count reference."
- "Stock changed while this count was open. Reopen Stock Check and verify the physical quantity." Another movement happened during your count. Reopen the form and count again.

## Stock movement ledger (history cannot be edited)
Keywords: ledger, history, audit, movement log, undo movement, delete movement, سجل

Every stock change is an **event** in the ledger: Opening stock, Supplier receipt, Production completion, Transfer Stock, Record Stock Adjustment, Physical Stock Check, Customer delivery and Verified legacy opening.

- View the ledger on **Inventory & Stock Movements** → **Movement history** (`#/movement`) or **Reports** → **Movement ledger** (`#/reports`).
- **View** on an event shows when and by whom it was recorded (the **Operator name** from the Company profile), the reference, related company, site and document, and each line's change and current balance. It has links such as **Open purchase**, **Open order** or **Open dispatch**, plus **Download PDF**.
- Events **cannot be edited or deleted**. Correct mistakes with a new **Stock Adjustment** or **Stock Check**. Operations with posted stock (completed orders, purchases with receipts, jobs with deliveries) can't be deleted either.

## Sales Orders page 🧾
Keywords: sales order, sales orders, customer order, sell, selling, order from customer, SO, مبيعات, طلبية, طلب زبون, بيع

**Sales Orders** (`#/sales`) is in the sidebar under **Operations**. It records what a customer ordered and delivers it in one or more shipments.

- The cards at the top show **Open orders**, **Awaiting delivery**, **Past requested date** and **Open order value** (from unit prices).
- The list shows each order with its customer, order date, requested delivery date (red when it has passed), number of items, a **Delivered** progress bar, value and status.
- Actions per order: **View**, **Edit**, **Confirm**, **Deliver**, **Cancel** and **Delete** (only the ones allowed for its status appear).
- **Sales deliveries** at the bottom lists every delivery posted from sales orders.

A sales order can contain **any stock item**: products, parts (for example loose safety nets), variants or raw materials, with several lines per order.

## Create a sales order
Keywords: new sales order, add sales order, record customer order, create order for customer, quotation, PO from customer, طلبية جديدة, اضافة طلب

1. Open **Sales Orders** (`#/sales`) and click **New Sales Order**.
2. Choose the **Customer**. Optionally choose a **Customer delivery site (optional)** from that customer's locations.
3. Optionally enter **Customer PO / reference (optional)**, change the **Order date**, and set a **Requested delivery date (optional)**.
4. In **Order line**, pick the **Item / SKU**, enter the **Ordered quantity** and optionally a **Unit price (AED, optional)**. Click **Add Line** for more items (one line per item).
5. The **Order total** appears when unit prices are entered.
6. Click **Save Order**. The order gets a number starting **SO-** and status **Draft**.

Then click **Confirm** when the customer's order is final.

## Deliver a sales order (full or partial)
Keywords: deliver sales order, ship order, send to customer, partial delivery, give customer, deduct stock, delivery note, تسليم طلبية, تسليم جزئي, شحن للزبون

1. On **Sales Orders** (`#/sales`), click **Deliver** on a **Confirmed** or **Partially delivered** order.
2. Choose **Ship from (custody location)**: the store the goods leave from. **Available at source** shows the stock there for each line.
3. Enter **Delivery note / reference** (required and new for this order).
4. For each line, enter the quantity delivered now (up to the outstanding quantity). Leave 0 for lines not shipped yet.
5. Click **Confirm Delivery**.

The stock is deducted from that location immediately and a **Sales delivery** movement appears in **Inventory & Stock Movements**. The order becomes **Partially delivered** or **Delivered**. Repeat for later shipments.

Errors:
- "Insufficient stock for … at …": receive or transfer stock to that location first.
- "Delivery exceeds the outstanding quantity for …"
- "This order already has a delivery with that reference."
- "Confirm this order before delivering."

## Sales order statuses
Keywords: sales order status, draft, confirmed, partially delivered, delivered, cancelled, cancel sales order, حالة الطلبية

- **Draft**: just saved. **Edit**, **Confirm**, **Cancel**, **Delete**.
- **Confirmed**: ready to ship. **Edit** (until the first delivery), **Deliver**, **Cancel**, **Delete** (no deliveries yet).
- **Partially delivered**: some quantity shipped. **Deliver** the rest or **Cancel** the remaining balance. It can no longer be edited or deleted.
- **Delivered**: everything shipped.
- **Cancelled**: the undelivered balance is closed. Deliveries already made stay in the stock history.

**View** shows each line's ordered, delivered and outstanding quantities, total stock on hand, prices, and the delivery history, plus **Download PDF**.

## Example: receive 20 safety nets and deliver 13 to a customer
Keywords: receive 20 give 13, part of stock to customer, split stock, sell some nets, deliver some, جزء من الكمية, استلمت وبدي اعطي

1. **Receive the 20**: on **Purchasing** (`#/purchase`) create a **New Purchase Request** for the safety net with quantity 20, click **Mark Ordered**, then **Record Receipt** when it arrives. Stock = 20 at your custody location.
2. **Record the customer's order**: on **Sales Orders** (`#/sales`) click **New Sales Order**, choose the customer, add the safety net with quantity 13, save and click **Confirm**.
3. **Deliver**: click **Deliver**, choose the location, enter the delivery note and 13, then **Confirm Delivery**. Stock = 7.

You can also deliver 8 now and 5 later; the order shows **Partially delivered** until all 13 are shipped.

## Create a dispatch job 🚚
Keywords: dispatch, delivery, packing, ship, send to customer, DSP, job, شحن, تسليم, توصيل

1. Open **Packing & Dispatch** (`#/dispatch`) and click **New Dispatch Job**.
2. Fill **Reference / project** (required) and choose the **Source custody location** where the goods leave from.
3. Choose the **Customer** and the **Customer delivery site**. The customer must have at least one active location in its record.
4. Choose the **Fulfilment**: **Pack from parts** or **Finished stock** (see the next section).
5. Optionally tick **Keep delivered stock tracked at customer site**.
6. In **Complete product**, choose the **Product**. **Requested product quantity** fills with the product's Default order quantity. Adjust the per-part quantities and variants if needed.
7. Review the panel: destination with **Open in Google Maps**, plus **Packing requirements** or **Finished stock** availability.
8. Click **Save Job**. The job is **Open**, with a number starting **DSP-**.

Each job holds one product. Errors include "Enter a dispatch reference.", "Select a delivery site belonging to this customer." and "Save the Product BOM for … first."

## Fulfilment: Pack from parts vs Finished stock
Keywords: fulfilment, pack from parts, finished stock, kit, deduct parts, تجهيز

The **Fulfilment** choice on a dispatch job decides which stock is deducted when you confirm a delivery:

- **Pack from parts** (default): deducts the exact part and variant SKUs from the product's BOM (with your adjusted quantities) at the source location. Partial deliveries take a proportional share of each part. Use this when products are packed as kits of nets, aluminium rounds and accessories.
- **Finished stock**: deducts complete product units from the product's own stock at the source. You can use it only if the standard BOM quantities are kept and no variants are chosen. Otherwise: "Pack from component stock when variants or job-specific quantities are selected."

Finished product stock exists only if you added it through **Stock Adjustment**, **Stock Check** or **Transfer Stock**. See "How do I get finished product stock?".

## Track delivered stock at the customer site
Keywords: track at customer site, consignment, customer custody, delivered stock tracking, مخزون الموقع

When **Keep delivered stock tracked at customer site** is ticked on a dispatch job, each delivery **moves** the stock from the source location to the customer delivery site instead of removing it from the books. The stock stays visible as a balance at "Customer / Site".

Requirements:
- The customer delivery site must be a stock custody location. Edit the customer and tick **Use as AMBS stock custody location** on that site. Otherwise: "Enable stock custody on this customer site before tracking delivered stock there."
- The source and the site must differ: "Choose different source and customer-site custody locations."

When the box is not ticked, delivered stock leaves AMBS stock completely ("Delivered out").

## Record a delivery (confirm dispatch)
Keywords: confirm delivery, deliver, delivery note, partial delivery, record delivery, تأكيد التسليم

1. On **Packing & Dispatch** (`#/dispatch`), click **Record Delivery** on an Open or Partially delivered job.
2. Enter **Quantity delivered (outstanding N)**, a whole number up to the outstanding quantity.
3. Enter **Delivery note / reference** (required, and new for this job).
4. Check the **Stock posting preview**: Exact SKU, To deduct, Available at source, and Customer site after if tracked.
5. Click **Confirm Delivery**.

A "Customer delivery" event is posted. The job becomes **Partially delivered** or **Delivered**.

Errors:
- "Insufficient stock for … at …" Receive, produce or transfer the stock first.
- "Delivery exceeds the outstanding quantity."
- "Enter a new delivery reference." The reference is empty or already used on this job.
- "This dispatch job is closed."
- "This delivery changed in another tab. Reopen it to review current quantities."

## Dispatch job statuses and cancelling
Keywords: dispatch status, open, partially delivered, delivered, cancelled, cancel job, إلغاء الشحنة

- **Open**: no deliveries yet. Actions: **View**, **Edit**, **Record Delivery**, **Cancel**, **Delete**.
- **Partially delivered**: some quantity delivered. **Edit** and **Delete** are gone ("Jobs with confirmed deliveries cannot be edited."). **Record Delivery** and **Cancel** remain.
- **Delivered**: delivered quantity equals ordered quantity.
- **Cancelled**: **Cancel** → **Cancel remaining delivery** closes the outstanding balance. Confirmed deliveries and posted stock stay recorded.

The list shows Requested, Delivered and Outstanding. **View** shows the delivery site, map, saved packing configuration and delivery history (with **View stock posting**), plus **Download PDF**. "A job with deliveries cannot be deleted."

## How do I get finished product stock?
Keywords: product stock, finished goods, produce product, assemble product, make product stock, مخزون المنتج النهائي

Production orders manufacture **parts** only, and production plans never post stock. There is no "assemble product" transaction. You have two options:

1. **Usual way: dispatch from parts.** Keep the parts in stock (purchased, received or manufactured) and use **Pack from parts** on the dispatch job. The parts are deducted on delivery, and no product stock is needed.
2. **Hold finished products as stock.** Record them with **Inventory & Stock Movements** → **Stock Adjustment** (a positive quantity with a reason) or **Stock Check** (`#/movement`). Then use **Finished stock** fulfilment on dispatch.

Note that option 2 doesn't consume the parts automatically. If you assemble kits physically, also record negative adjustments for the parts used, so the part balances stay correct.

## End-to-end workflow: buy → receive → produce → dispatch → deliver
Keywords: workflow, process, step by step, full cycle, how to start, دورة العمل

1. **Setup**: add a custody location (**Settings & Data** → **Add Custody Location**). Then add suppliers, customers with their sites, raw materials, parts and products.
2. **BOMs**: create Part BOMs for manufactured parts and Product BOMs for products (`#/bom`).
3. **Plan** (optional): on **Production**, use **New Production Plan** to see the raw material shortages for the products you need. Click **Reserve** to hold the demand.
4. **Buy**: on **Purchasing**, use **New Purchase Request** → **Mark Ordered**.
5. **Receive**: **Record Receipt** with the supplier's delivery note. Stock increases at the receiving location.
6. **Produce**: on **Production**, use **Create Production Order** → **Release** → **Complete**. Raw materials are consumed and the part is added. Use **Transfer Stock** if materials are at another location.
7. **Sell / dispatch**: record the customer order on **Sales Orders** and **Deliver** it (any item), or use **Packing & Dispatch** → **New Dispatch Job** with **Pack from parts** for packed product kits.
8. **Deliver**: **Record Delivery** with the delivery note. Parts are deducted, or moved to the customer site if tracked.
9. **Close the plan**: **Close reservation**.
10. **Control**: run **Stock Check** periodically and review **Reports**.

## Reports page and exports 📈
Keywords: reports, stock report, export, CSV, Excel, PDF, ledger export, تقرير, تصدير

**Reports** (`#/reports`) shows:
- **Stock status**: every item, custody location and physical balance.
- **Shortages and safety stock**: materials below safety stock and reserved demand shortages.
- **Movement ledger**: all stock events.

Buttons at the top right:
- **Stock PDF** downloads "AMBS_Stock_status.pdf" with the company header and logo.
- **Stock CSV** downloads "AMBS_stock.csv", which opens in Excel.
- **Ledger CSV** downloads "AMBS_ledger.csv" with one row per event line: Date, Event, SKU, Location, Quantity change, Unit, Related company, Related site, Processor, Processing site, Document, Reference, By.

There are no date-range filters or valuation reports. Filter the CSV in Excel if needed.

## Download PDF of a plan, order, purchase, delivery or movement
Keywords: PDF, print, download document, print order, print delivery note, طباعة, PDF

Open the record's **View** window and click **Download PDF** (bottom). Available for:
- **Production plans**: products, consolidated demand and BOM trace.
- **Production orders**: part, quantity, location, customer or processor, and BOM trace.
- **Purchase requests**: supplier, receiving location and lines with Ordered, Received and Outstanding.
- **Dispatch jobs**: product, customer site, parts, stock tracking and deliveries.
- **Stock events**: lines and related documents.

PDFs carry the company name, address, phone, email, TRN and logo from the **Company profile**, so fill those in **Settings & Data**. If you see "PDF export is unavailable", the PDF library failed to load. Reload the page.

## Stock alerts and warnings ⚠️
Keywords: alerts, warnings, low stock, reorder, shortage alert, safety stock alert, تنبيه

The app raises two kinds of alerts. They appear on the **Dashboard** (**Stock alerts**, plus the **Stock Warnings** card) and on **Reports** → **Shortages and safety stock**:

1. **Safety stock**: an active raw material whose total on-hand quantity across **all custody locations** is below its **Safety / minimum stock**. The shortfall is the amount below safety.
2. **Reserved demand shortage**: at a given location, the material reserved by **Released** production orders and **Reserved** plans exceeds the physical balance there.

To clear them, buy and receive stock, transfer it to the right location, or adjust the safety level in the material's **Edit** form. The app does not create purchase requests automatically. The only exception is the **Purchase N × code** button in Product Nesting results.

## Company profile settings (name, logo, operator)
Keywords: company profile, logo, company name, TRN, tax, operator name, user name, address, الشركة, الشعار

1. Open **Settings & Data** (`#/settings`).
2. In the **Company profile** card, click **Edit company profile**.
3. Edit **Company** (required), **Operator name** (required), **Address**, **Phone**, **Email**, **Tax registration** and **Image** (the logo).
4. Click **Save**.

The company name appears in the sidebar footer and PDF headers. Address, phone, email and TRN appear on PDFs, and the logo is printed in the PDF header. **Operator name** (default "Store Keeper") is written as **By** on every stock movement. It is one shared name, not the signed-in user, so update it when the person operating the app changes.

"Company and operator name are required." In the cloud workspace only an admin can save this form.

## Export a backup (JSON) 💾
Keywords: backup, export, save data, download data, copy data, move computer, نسخة احتياطية

1. Open **Settings & Data** (`#/settings`).
2. In **Back up and restore**, click **Export Backup (JSON)**.
3. A file named **AMBS_Backup_YYYY-MM-DD.json** downloads. It contains all master data, operations, the stock ledger, settings, Product Calculator take-offs and the legacy archive.

Export regularly, especially in the **browser workspace**, where clearing browser data or changing computer loses everything. Keep the file safe, because it contains all company records, including images.

## Import a backup
Keywords: import, restore backup, load backup, upload JSON, merge data, استيراد, استرجاع

1. Open **Settings & Data** (`#/settings`) and click **Import Backup**.
2. Choose an AMBS backup **.json** file (up to 100 MB).
3. **Preview Backup Import** lists how many records each collection contains ("Existing records are retained. A conflicting record stops the entire import.").
4. Click **Confirm Import**.

The import **merges**: new records are added and identical records are skipped. If the workspace was empty, the company settings come from the backup. Old-format backups (version 1) go into the **Legacy migration review**.

Errors:
- "Choose a valid AMBS JSON backup."
- "Backup exceeds 100 MB."
- "Conflicting record in … (id). Review the conflicting record before importing." The same record ID exists with different content, so nothing is imported.
- "The backup produces an invalid or negative stock balance."

In the cloud workspace, imports that change the legacy archive need an admin.

## Legacy migration review
Keywords: legacy, migration, old data, verify opening, classify, review required, البيانات القديمة

After importing an old-format backup, **Settings & Data** (`#/settings`) shows **Legacy migration review**, and the Dashboard shows a reminder.

- **View original** shows the old record. **Download PDF** is also available there.
- **Verify Opening** (old materials with balances) opens **Verify legacy opening stock**. Choose the **Custody location**, enter the **Verified opening quantity (zero to close without posting)** and the **Verification reason / reference**, tick **I verified this balance**, and click **Confirm Review**. If the SKU already has movements, you see "This SKU already has stock events. Use physical stock counts to reconcile it, then close this review with zero."
- **Classify** (old products) lets you mark each one as **Part**, **Complete Product** or **Keep in legacy history**, with a **Code / SKU**. Converted parts get an unapproved Part BOM from the old formulas. Review it and approve it on the BOM page.

Old plans, purchases, receipts, movements and stock checks appear read-only as "Legacy …" sections on their pages.

## Tools page 🧮
Keywords: tools, calculators, utilities, steel tools, أدوات

**Tools** (`#/tools`) opens four engineering utilities:

1. **Steel Weight Calculator** (`#/steel`): the weight of standard and custom steel profiles.
2. **Market Sections** (`#/market`): browse standard steel sections and sizes.
3. **Product Calculator** (`#/prodcalc`): save product take-offs with weights, costing and cutting lists.
4. **Product Nesting** (`#/nesting`): optimize bar cuts against stock lengths.

Each card has an **Open …** button. These tools are separate from stock. They never post stock movements. Product Calculator take-offs are saved in the workspace and included in backups.

## Steel Weight Calculator
Keywords: steel weight, kg per meter, tonnage, calculate weight, SHS, RHS, beam weight, plate weight, وزن الحديد

On **Steel Weight Calculator** (`#/steel`):

1. Choose the **Family**. Options include hollow sections (SHS, RHS, CHS pipe), beams (IPE, IPN, HEA, HEB, HEM, UB, UC), channels (UPN, PFC), angles (equal and unequal), and plates and bars (plate/sheet, chequered plate, flat, round, square and hexagonal bar).
2. Choose the **Material**: mild steel, stainless 304, cast iron, aluminium, brass or copper. The density scales the weight.
3. Choose a size and wall thickness, or a designation, or type dimensions for plates and bars.
4. Choose the **Length**: 6 m, 12 m or **Custom…**.
5. Enter the **Number of pieces** and optionally the **Tonnage rate** (AED/Ton).

**Result** shows Weight per metre, Single piece, Total, Total tonnage and Total cost (when a rate is entered). A dimensioned cross-section sketch is shown. **Browse Market Sections** opens the catalogue. Results aren't saved. Use the Product Calculator to save them.

## Market Sections catalogue
Keywords: market sections, steel catalogue, section sizes, available sizes, browse steel, كتالوج

**Market Sections** (`#/market`) is a browse-only catalogue of standard steel sections:

1. Pick a family on the left, under Hollow sections, Beams & columns, Channels, Angles, or Plates & bars.
2. Search sizes with the box, for example "100x50" or "200".
3. Choose the **Stock length**: **6 m** or **12 m**.
4. Each card shows the sketch, standard, outer size, thickness and length.
5. Click **Add to Product Calc** to open the Product Calculator's **Add section** dialog pre-filled with that size.

Plates and bars are made to order, so their card offers **Open in Product Calculator** instead.

## Product Calculator (take-offs and costing)
Keywords: product calculator, take-off, costing, estimate, weight take-off, WGT, cost estimate, حساب المنتج, تسعير

**Product Calculator** (`#/prodcalc`) lists saved take-offs (numbers start **WGT-**) with Date, Product / project, Lines, Total weight and Total cost. Actions are View, PDF, Edit and Delete, and there is a search box.

1. Click **Create new**, or **Load sample product** when the list is empty.
2. Fill in the tabs:
   - **Product Info**: **Product name** (required), Project / client reference, Revision, Date, Prepared by, **Sets / units to manufacture**, notes.
   - **Steel Lines**: **Add steel section**.
   - **Plate Parts**: **Add plate part**.
   - **Cost Centres**: **Add cost item**, for paint, galvanizing, labour and similar.
   - **Nesting**, **Purchase**, **Reports**.
3. Click **Save** (top right). "Product saved" confirms it.

Errors: "Enter a product name" and "Add at least one section, plate or cost item". **Close** returns to the list. Unsaved changes are lost.

## Product Calculator: steel lines, plates and cost centres
Keywords: add section, manual section, override kg/m, plate part, cost item, galvanizing, paint, labour

- **Add steel section** dialog: choose the **Section family**. For SHS, RHS and CHS, choose an **Input mode**: **Catalogue section** or **Manual custom section** (kg/m calculated from your dimensions). Then choose the **Material**, size, **Cut length, L (m)**, **Standard stock length** (used by nesting), **Quantity (pcs)** and an optional **Tonnage rate** (AED/Ton). **Override kg/m manually** sets your own weight per metre and shows a warning. Click **Add section** or **Update section**.
- **Plate Parts** (rectangular plates for 2D nesting): Part name, Length (mm), Width (mm), Thickness (mm), Quantity / set, Material grade, Tonnage rate (AED/Ton), Stock plate size (mm) (entered as L×W), Rotation mode (Auto (best) / 90° only / Lock orientation / Grain locked) and Remarks.
- **Add cost item**: Category, Unit, Description, Quantity, Unit cost (AED) and Remarks. "Enter category, unit, quantity and unit cost".

The totals show weight and cost per unit, and everything is multiplied by **Sets** for batch totals.

## Product Calculator: nesting, purchase list and reports
Keywords: nesting tab, cutting list, DXF, purchase list, print report, kerf, off-cut, قائمة القص

- **Nesting** tab: set **Kerf — saw/cut width (mm)**, **Min. reusable off-cut (mm)**, **Plate margin (mm)**, **Rotation mode** and **Default plate stock size** (or Custom). Then click **Run full nesting (1D + 2D)**. Results show bars and plates needed, utilization, waste and cutting patterns.
- **Purchase** tab: steel long products (bars to buy), plates, and non-steel cost items with totals.
- **Reports** tab: **Print / preview** opens printable reports in a new window. The reports are Product costing summary, Full product breakdown, Steel weight calculation, 1D nesting report, 2D plate nesting report, Plate wastage report, Cutting list, Purchase list, Supervisor production report, Cost centre / consumables and Full project estimation. Allow pop-ups: "Allow pop-ups to print reports".
- **Exports**: **Export PDF**, **Export DXF** (all sheets) and **Export DXF ×N** (one per sheet). Run nesting first ("Run nesting first").
- **Run heavy self-test** builds a large test product and replaces the unsaved one.

## Product Nesting page (bar cutting optimization)
Keywords: nesting, cutting optimization, bars to buy, cut plan, offcuts, utilization, تحسين القص

**Product Nesting** (`#/nesting`) works on take-offs saved in the Product Calculator. If none exist, create one first.

1. Choose the **Product (from Product Calculator)**.
2. Enter **Sets to manufacture**, **Kerf — saw cut width (mm)** and **Minimum usable off-cut (mm)**.
3. In **Stock length & rate per section**, set each section's **Stock length (m)**, existing **Off-cuts in stock** (comma-separated metres), **Rate basis** (per kg or per bar) and **Rate (AED)**. Values come from a linked raw material when one matches.
4. Click **Run nesting**.

Results show bars to buy, utilization, weight, cost, waste and bar cutting maps. Buttons:
- **Download cutting plan PDF**.
- **Purchase list**, which prints from a pop-up.
- **Purchase N × [material code]** for linked materials. It opens a **New Purchase Request** pre-filled with that raw material and bar count.

## Link a raw material to the calculators
Keywords: section profile, stock length, rate per kg, rate per piece, link material nesting

Raw materials can feed the nesting tools with their stock length and price:

1. Open **Raw Materials** (`#/materials`) and click **Edit** on a material, for example an SHS tube.
2. Set **Section profile (links to calculators)** to the matching family, for example "Hollow section — square (SHS)".
3. Set **Stock length (m)** (default 6), **Rate (AED per kg)** and/or **Rate (AED per piece)**.
4. Click **Save changes**.

On **Product Nesting** (`#/nesting`), a section of that family shows "↔ code name" and uses the material's stock length and rate. A **Purchase N × code** button then appears in the results. If no material is linked, the row shows "no linked raw material" and defaults to 6 m and rate 0.

## Error: "Insufficient stock for … Available …"
Keywords: insufficient stock, not enough stock, negative stock, available, stock error, لا يوجد مخزون كافي

Full message: "Insufficient stock for [item] at [location]. Available [qty] [unit]."

The app never allows a balance below zero at any location. It appears on transfers, negative adjustments, production order completion (raw materials) and delivery confirmation (parts or products).

How to fix it:
1. Check the balance per location on **Inventory & Stock Movements** (`#/movement`). The stock may be at a **different location**. Use **Transfer Stock**.
2. Make sure you picked the right **SKU**. For parts with variants, stock is per variant (size or color).
3. Receive pending purchases (**Purchasing** → **Record Receipt**) or complete production orders.
4. If the physical stock really exists, record a **Stock Check** with the counted quantity.
5. For dispatch, lower the quantity or the adjusted part quantities, or use the other **Fulfilment** option.

## Error: "Select an active stock custody location." and other selection errors
Keywords: select an active record, active stock SKU, custody location error, selection error, اختر موقع

- **"Select an active stock custody location."** The chosen location is archived, is not marked for stock custody, or belongs to an archived company. Pick another location or fix it. See "Why is the custody location list empty?".
- **"Select an active record."** A chosen supplier, customer, product, part, material or location is archived or was deleted, or nothing was picked in a searchable field. Re-select from the list by clicking a suggestion.
- **"Select an active stock SKU. Parts with variants use the specific variant SKU."** Choose the variant (size or color) SKU instead of the generic part, or restore the archived item.
- **"Choose a company for the linked site."**, **"Choose a site belonging to the selected company."**, **"Choose a related company for this site."** and **"Choose a site belonging to the related company."** Pick the company first, then one of its own sites.

## Error: "This code or SKU is already in use." and required fields
Keywords: duplicate code, code in use, SKU exists, code and name required, كود مكرر

- **"This code or SKU is already in use."** Codes must be unique (case-insensitive) across all raw materials, parts, products and variants together. Companies are checked within their own type (customers among customers, and so on). Choose another code, or find the existing record with the list search.
- **"Code and name are required."** Fill both **Code** and **Name**.
- **"Enter a stock unit using letters, numbers, spaces, / or -."** See "Units of measure".
- **"Default order quantity must be a whole number."** / **"… must be greater than zero."** Product default order quantity must be at least 1.
- **"safety must be zero or greater."** (also bundle, stockLen, rateKg, ratePc). The message uses the internal field name. **Safety / minimum stock**, **Bundle quantity**, **Stock length (m)** and the **Rate** fields can't be negative or empty.

## Error: "This record changed. Reopen it before saving." (conflicts)
Keywords: record changed, reopen, another tab, another employee, conflict, refresh, تعارض

The app protects against two people (or two browser tabs) overwriting each other's work. Typical messages:
- "This record changed. Reopen it before saving." / "… before deleting."
- "This plan changed. Reopen it before saving."
- "This request changed or has receipts. Reopen it before saving."
- "This order changed or has posted stock. Reopen it before saving."
- "This job changed or has deliveries. Reopen it before saving."
- "This company’s locations changed. Reopen it before saving."
- "The Product BOM changed. Reopen the product before saving."
- "Another tab saved a change. Refresh before saving again." (browser workspace)
- "Another employee saved a change. Reload before saving again." / "The workspace changed. Reload before saving again." (cloud)

Fix: **Cancel** the form, click **Refresh** in the top bar (or reload the page), reopen the record and redo your change.

## Error: cannot archive or delete
Keywords: cannot delete, cannot archive, used elsewhere, linked history, delete failed, لا يمكن الحذف

- "This record is used elsewhere. Remove its links first, or archive it." The record is referenced by a BOM, movement, operation or location. **Archive** it instead.
- "This record has linked history and cannot be deleted."
- "Completed production orders cannot be deleted."
- "A purchase with receipts cannot be deleted." **Cancel** it instead.
- "A job with deliveries cannot be deleted." **Cancel** it instead.
- "Move, consume or reconcile remaining stock before archiving this SKU." Bring the balance to zero first, with Transfer, Adjustment or Stock Check.
- "Remove this item from active BOMs before archiving it."
- "This record is used in an open operation." Finish or cancel the open plan, order, purchase or dispatch first.
- "Resolve balance and open operations at this location first."

## Error: BOM not ready ("Approve the Part BOM…" / "Save the Product BOM…")
Keywords: BOM missing, approve BOM, product BOM error, standard BOM changed, BOM not approved

- **"Approve the Part BOM for [part] first."** A Manufactured part used in an order or plan has no Part BOM, or it isn't approved. Go to **Bill of Materials** (`#/bom`) → **Edit BOM** → tick **Approve for operational use** → **Save BOM**. If the part is actually bought, change its **Part source** to Purchased or Stocked.
- **"Save the Product BOM for [product] first."** The product has no approved Product BOM. Enter part quantities in the product form, or create or approve it on the BOM page.
- **"The standard BOM changed. Reload the product to use the latest recipe."** / **"The standard BOM changed. Reload the product."** The BOM was edited while your form was open. Close the form and start again.
- **"Select a variant belonging to that part."** / **"The selected variant belongs to a different part."** Re-pick the variant.

## Errors in purchasing and receiving
Keywords: purchase error, receipt error, outstanding, mark ordered first, purchase line error, خطأ الشراء

- "Add at least one line and use one line per SKU." You have no lines, or the same item twice. Combine the quantities on one line.
- "Choose a raw material or a purchased or stocked component." Manufactured parts and products can't be purchased. Change the part source if you buy it.
- "Purchased component quantity must be a whole number." Use whole numbers for count units.
- "This purchase status has changed." Click **Refresh**.
- "Mark this request ordered before confirming a receipt."
- "Receipt exceeds the outstanding quantity for …" You can't receive more than ordered. Create a new purchase request for extra goods.
- "Enter a received quantity." / "Enter a receipt reference."
- "This purchase already has a receipt with that reference." Use a different delivery note number.
- "Select an active stock custody location." The receiving location was archived. Choose another.

## Errors in dispatch and delivery
Keywords: dispatch error, delivery error, delivery site empty, customer site missing, خطأ التسليم

- **Customer delivery site list is empty.** The customer has no active location. Edit the customer and click **Add Location**.
- "Select a delivery site belonging to this customer." Re-select the site after changing the customer.
- "Enter a dispatch reference."
- "Enable stock custody on this customer site before tracking delivered stock there."
- "Choose different source and customer-site custody locations."
- "Pack from component stock when variants or job-specific quantities are selected." Switch to **Pack from parts** or restore the standard quantities.
- "Jobs with confirmed deliveries cannot be edited." Cancel the remainder and create a new job if needed.
- "Delivery exceeds the outstanding quantity." / "Enter a new delivery reference." / "This dispatch job is closed."
- "Insufficient stock for …" The source location lacks the parts or products. Transfer, receive or produce them first.

## Errors with variants and part sources
Keywords: variant error, generic part stock, reconcile generic, source change error

- "Reconcile generic stock for this part before enabling variant stock." The part has a balance as a generic SKU. Use **Stock Adjustment** to bring it to zero, then add variants and re-enter the stock on the right variants.
- "Close open operations using the generic part SKU before adding variants." Finish or cancel draft or released orders, reserved plans or open dispatch jobs that use the generic part.
- "Reconcile the generic part balance first." This appears when restoring a variant while the generic part holds stock.
- "Archive this part’s variants first." Archive each variant (**Variants** → **Archive**) before archiving the part.
- "Close open production orders before changing this part’s source."
- "Multiple inventory SKUs match … Keep one matching SKU before saving." Two parts or variants have the same packing name and unit. Archive or rename one.
- "This part uses variants. Create a variant SKU named … with the workbook unit first."

## Things the app cannot do
Keywords: limitation, not possible, missing feature, can't, unsupported, غير ممكن

The current version does **not** support:
- Assembling finished products from parts as a stock transaction. Production orders make parts only. See "How do I get finished product stock?".
- Editing or deleting posted stock movements. Correct them with adjustments or counts.
- Invoices, payments or stock valuation. Sales orders can hold optional unit prices and show an order total, but no invoice or payment is created.
- Reserving stock for a sales order. Confirmed sales orders do not hold stock; it is only deducted when you confirm a delivery.
- Automatic purchase suggestions or reorder requests from safety stock. You create purchase requests yourself, apart from the nesting **Purchase N × code** button.
- More than one product per dispatch job.
- Managing users, roles or invitations inside the app. Members are set up by the administrator.
- Per-user names on movements. **By** is the shared **Operator name** from the Company profile.
- Date-range filters on reports. Export the CSV and filter it in Excel.
- Pictures on locations. (Companies can have a logo.)
- Syncing a browser workspace between computers. Use **Export Backup (JSON)** and **Import Backup**.
