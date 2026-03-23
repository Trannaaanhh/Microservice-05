# 📊 Mermaid Diagrams - Sequence & Architecture

All diagrams in `.mmd` format ready to use.

## 📋 Files

| File | Flow | Extension |
|------|------|-----------|
| `01-auth-login.mmd` | Customer Registration & Login | .mmd |
| `02-shopping-cart.mmd` | Browse Products & Add to Cart | .mmd |
| `03-payment-checkout.mmd` | Checkout & Payment Processing | .mmd |
| `04-ratings-recommendations.mmd` | Product Rating & Recommendations | .mmd |
| `05-order-tracking.mmd` | Order Status Tracking & Notifications | .mmd |
| `06-error-handling.mmd` | Error Handling & Retry Logic | .mmd |
| `07-database-transactions.mmd` | Database Transactions | .mmd |
| `08-architecture-overview.mmd` | System Architecture Overview | .mmd |

## 🚀 How to Use

### Option 1: Mermaid Live Editor
1. Open https://mermaid.live
2. Open one of the `.mmd` files from this folder
3. Copy content
4. Paste into Mermaid Live
5. Export as PNG/SVG

### Option 2: VS Code with Mermaid Extension
1. Install extension: `Markdown Preview Mermaid Support`
2. Open any `.mmd` file
3. Preview will render automatically

### Option 3: Include in Markdown
```markdown
```mermaid
---@import ./01-auth-login.mmd
```
```

### Option 4: CI/CD Integration
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i 01-auth-login.mmd -o 01-auth-login.png
```

## 📌 Notes

- All diagrams use **Mermaid 10.x** syntax
- Compatible with GitHub, GitLab, Notion, Confluence
- Ready for presentations & documentation
- Color-coded for easy identification

---

**Total**: 8 diagrams
**Format**: `.mmd` (Mermaid Markup Language)
**Last Updated**: 23/03/2025
