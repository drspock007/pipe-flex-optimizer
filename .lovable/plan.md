

# Pipe Settlement Flexibility Optimizer

A professional engineering SaaS tool for calculating bending stress in steel pipes under self-weight and imposed settlement, with automatic support optimization.

---

## 1. Application Layout & Theme

- **Header** with app name, logo area, and orange (#ff8e04) accent branding
- **Subtle grid/dot background** for engineering aesthetic
- **Card-based layout** with clean sections for inputs, results, and chart
- **Responsive design** — works on desktop and tablet
- **Dark/light mode** support

---

## 2. Input Panel (Left Side)

### Geometry Card
- Input fields for **Do**, **t**, **L**, **h** with default example values (114.3mm, 6.02mm, 30m, 2500mm)
- Auto-calculated display of **Di**, **A**, **I**, **c** — shown as read-only computed values

### Material Card
- Dropdown for **API 5L grades** (X52, X60, X65, X70, Custom)
- Editable **Young's modulus** field (default 210 GPa)
- Custom yield strength input when "Custom" is selected

### Allowable Stress Card
- Slider/input for **allowable percentage** (default 80%)
- Display of computed **yield strength**, **percentage**, and **allowable stress**

### Load Card
- Checkbox to **include self-weight** (default checked)
- Editable **density** field (default 7850 kg/m³)
- Display of computed **linear weight q**

---

## 3. Engineering Calculation Engine

- Fixed-fixed beam model: **M_max = qL²/12 + 6EIh/L²**
- Bending stress: **σ_max = M_max × c / I**
- **Automatic iterative support optimization**: if stress exceeds allowable, add simple supports at equal spacing, recalculate per span, repeat until safe
- All calculations run **in real-time** as inputs change — no submit button needed

---

## 4. Interactive Stress Chart

- **Recharts-based** interactive graph
- X-axis: position along pipe length
- Y-axis: bending stress (MPa)
- **Orange stress curve** (#ff8e04), **red dashed allowable line**, **green safe shading**
- **Vertical markers** at support positions
- **Highlight** of maximum stress location
- Smooth transitions on recalculation

---

## 5. Output/Results Panel (Right Side)

- **Maximum bending stress** and **allowable stress** with comparison
- **Safety status badge** — green "SAFE" or red "NOT SAFE"
- **Number of intermediate supports required**
- **Final span length** between supports
- **Governing span** identification
- **Section properties summary** (A, I, weight/m)

---

## 6. Export Features

- **PDF report** generation with all inputs, results, and chart
- **Excel export** of calculation data
- **Shareable URL** encoding all parameters in query string

---

## 7. Unit Toggle

- **SI / Imperial** toggle switch
- Automatic conversion of all displayed values

