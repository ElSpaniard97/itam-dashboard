# HC IT Pros — ITAM Dashboard

An interactive **IT Asset Management (ITAM) Dashboard** that loads data directly from a CSV file.  
Built for **HC IT Pros** in the same color palette and design style as the main [HC IT Pros website](https://elspaniard97.github.io/hc-it-pros/).

🌐 **Live Dashboard:** [https://elspaniard97.github.io/itam-dashboard/](https://elspaniard97.github.io/itam-dashboard/)

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

markdown
Copy code

- The **CSV file** drives all data shown on the dashboard.  
  The **first row** is automatically treated as headers (e.g., `Category`, `Status`, `Model`, etc.).
- Tabs automatically filter rows where the **Category** column matches the tab name.

---

## 🚀 Hosting on GitHub Pages

1. The project is already live at:  
   👉 **[https://elspaniard97.github.io/itam-dashboard/](https://elspaniard97.github.io/itam-dashboard/)**

2. To update or redeploy:
   ```bash
   cd path/to/itam-dashboard
   git add .
   git commit -m "Update ITAM Dashboard"
   git push
GitHub Pages will automatically rebuild and deploy your site within a few minutes.

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
The dashboard will automatically display the updated data.

⚙️ Local Testing
If you want to test changes before pushing to GitHub:

bash
Copy code
python3 -m http.server
Then open:

bash
Copy code
http://localhost:8000/itam-dashboard/
🧠 Notes
Ensure your CSV includes a Category column for tab filtering to work.

To add new categories or tabs, simply edit the <nav> in index.html and add matching values.

Everything runs client-side — no backend or database required.

🧾 License
© 2025 HC IT Pros.
Designed and developed by Ezekiel Correa.
Free for personal or internal business use.
