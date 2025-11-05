# HC IT Pros — ITAM Dashboard

An interactive **IT Asset Management (ITAM) Dashboard** that loads data directly from a CSV file.  
Built for HC IT Pros in the same color palette and design style as the main website.

---

## 🧩 Features

- **Automatic CSV loading** from the `/data` folder  
- **Tabs** for Assets, Inventory, Consumables, Models, Categories, Employees, Locations, and Reports  
- **Summary cards** for total items, unique models, and top statuses  
- **Search bar** with live filtering  
- **Sortable columns** (click any header to sort ascending/descending)  
- **Fully responsive design** (desktop and mobile friendly)  
- **Modern HC-IT-Pros theme** — navy background, aqua accents, Inter font

---

## 📁 Project Structure

itam-dashboard/
├── index.html
├── style.css
├── script.js
├── assets/
│ └── logo.svg
└── data/
└── Stock Dashboard - Copy of Data.csv

yaml
Copy code

- The **CSV file** drives all data shown on the dashboard.  
  The **first row** is automatically treated as headers (e.g., `Category`, `Status`, `Model`, etc.).
- Tabs automatically filter rows where the **Category** column matches the tab name.

---

## 🚀 Hosting on GitHub Pages

1. Create a new repository on GitHub, for example:

https://github.com/<YOUR_USERNAME>/itam-dashboard

csharp
Copy code

2. Upload or push all the files in this folder:

```bash
cd path/to/itam-dashboard
git init
git add .
git commit -m "Initial commit - ITAM Dashboard"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/itam-dashboard.git
git push -u origin main
Go to your repository’s
Settings → Pages → Build and deployment

Source: Deploy from a branch

Branch: main

Folder: / (root)

Click Save

GitHub will publish your dashboard at:

arduino
Copy code
https://<YOUR_USERNAME>.github.io/itam-dashboard/
📊 Updating Data
To refresh your dashboard with new inventory or asset data:

Replace the file in /data/:

kotlin
Copy code
data/Stock Dashboard - Copy of Data.csv
Commit and push the changes:

bash
Copy code
git add data/Stock\ Dashboard\ -\ Copy\ of\ Data.csv
git commit -m "Update ITAM data"
git push
The dashboard will automatically show the new data.

⚙️ Local Testing
You can preview the dashboard locally before pushing to GitHub:

bash
Copy code
python3 -m http.server
Then open:

bash
Copy code
http://localhost:8000/itam-dashboard/
🧠 Notes
Ensure your CSV has a Category column for tab filtering to work.

If you add new categories, simply add a matching <a class="tab"> in index.html.

No backend required — everything runs client-side.

🧾 License
© 2025 HC IT Pros.
Designed and developed by Ezekiel Correa.
Free for personal or internal business use.
