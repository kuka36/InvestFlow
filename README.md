
# PanassetLite (盘资产·轻)

<div align="center">

[![Website](https://img.shields.io/badge/Demo-Visit%20App-blue?style=for-the-badge&logo=google-chrome)](https://kuka36.github.io/PanassetLite/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css)

**一款面向个人用户简易实用的全资产管理应用（盘资产·轻）**
<br/>
**具有极好的用户体验、强大的可视化功能和人工智能驱动的投资组合洞察。**

---

<p align="left">
这是“零门槛、无需注册、本地数据”的版本。<br/>
它的精神是：<strong>简单、随时用、轻松地帮你管理资产</strong>。
</p>

</div>

## 📸 系统截图 (Screenshots)

![Dashboard Overview](_image/overview.png)

> *仪表盘概览 - 实时掌握净值动态与资产分布*

---

## ✨ 核心特性 (Key Features)

- **💎 全资产覆盖**  
  支持股票 (Stock)、加密货币 (Crypto)、基金 (Fund)、房地产 (Real Estate)、现金 (Cash) 及负债 (Liability) 管理。

- **🛡️ 隐私至上 (Local First)**  
  无需注册，数据完全加密存储在您的本地浏览器 (LocalStorage)，确保财务隐私绝对安全。

- **🧠 AI 智能顾问 (Gemini Powered)**  
  集成 Google Gemini AI，为您提供专业的投资组合风险评估、财富健康检查与优化建议。

- **📈 实时行情**  
  自动对接 Alpha Vantage (股票) 和 CoinGecko (加密货币) API，实时更新资产现值。

- **💱 多币种自动折算**  
  内置实时汇率引擎，支持 USD, CNY, HKD 等多币种资产自动折算为统一基准货币展示。

- **📊 强大的可视化**  
  提供净值走势图、资产配置饼图、盈亏排行等多种交互式图表。

---

## 🛠️ 技术栈 (Tech Stack)

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS, Lucide Icons
*   **Visualization**: Recharts
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **Market Data**: Alpha Vantage API, CoinGecko API

---

## 🚀 快速开始 (Run Locally)

**前置要求**: Node.js 18+

1.  **克隆项目**
    ```bash
    git clone https://github.com/kuka36/PanassetLite.git
    cd PanassetLite
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    打开浏览器访问 `http://localhost:3000` 即可使用。

4.  **构建部署**
    ```bash
    npm run build
    ```

---

## ⚙️ API 配置 (Optional)

为了获得完整的 AI 分析与实时股价体验，建议在应用的 **设置 (Settings)** 页面配置以下 Key（均为免费申请）：

1.  **Google Gemini API Key**: 用于 AI 风险分析。 ([申请链接](https://aistudio.google.com/app/apikey))
2.  **Alpha Vantage API Key**: 用于美股/港股实时价格。 ([申请链接](https://www.alphavantage.co/support/#api-key))

*注：若不配置 API Key，应用仍可完美支持手动记账与资产统计功能。*

---

## 📄 License

MIT License © 2025 PanassetLite
