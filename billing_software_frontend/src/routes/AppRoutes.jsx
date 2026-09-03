import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import ProductList from "../pages/products/ProductList";
import ProductForm from "../pages/products/ProductForm";
import Billing from "../pages/billing/Billing";
import AddSale from "../pages/sales/AddSale";
import ReportsLayout from "../components/reports/ReportsLayout";
import { defaultReportPath } from "../components/reports/reportNavigation";
import Sale from "../pages/reports/transactions/Sale";
import Purchase from "../pages/reports/transactions/Purchase";
import DayBook from "../pages/reports/transactions/DayBook";
import AllTransactions from "../pages/reports/transactions/AllTransactions";
import ProfitAndLoss from "../pages/reports/profit-loss/ProfitAndLoss";
import BillWiseProfit from "../pages/reports/profit-loss/BillWiseProfit";
import CashFlow from "../pages/reports/financial/CashFlow";
import TrialBalance from "../pages/reports/financial/TrialBalance";
import BalanceSheet from "../pages/reports/financial/BalanceSheet";
import PartyStatement from "../pages/reports/party/PartyStatement";
import PartyWiseProfitLoss from "../pages/reports/party/PartyWiseProfitLoss";
import AllParties from "../pages/reports/party/AllParties";
import PartyReportByItem from "../pages/reports/party/PartyReportByItem";
import SalePurchaseByParty from "../pages/reports/party/SalePurchaseByParty";
import SalePurchaseByPartyGroup from "../pages/reports/party/SalePurchaseByPartyGroup";
import Settings from "../pages/settings/Settings";
import MainLayout from "../layouts/MainLayout";
import CompanyList from "../pages/company/CompanyList";
import CompanyForm from "../pages/company/CompanyForm";
import EditCompany from "../pages/company/EditCompany";
import TaxList from "../pages/tax/TaxList";
import TaxForm from "../pages/tax/TaxForm";
import Invoice from "../pages/billing/Invoice";
import EditProduct from "../pages/products/EditProduct";
import NotFound from "../pages/NotFound";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import CashierForm from "../pages/cashier/CashierForm";
import CashierList from "../pages/cashier/CashierList";
import EditCashier from "../pages/cashier/EditCashier";
import CategoryForm from "../pages/category/CategoryForm";
import CategoryList from "../pages/category/categoryList";
import EditCategory from "../pages/category/EditCategory";
import SubcategoryForm from "../pages/subcategory/Subcategoryform ";
import SubcategoryList from "../pages/subcategory/Subcategorylist";
import EditSubcategory from "../pages/subcategory/Editsubcategory";
import Profile from "../pages/profile/profile";
import ForgotPassword from "../pages/auth/ForgotPassword";
import RegisterCompany from "../pages/auth/registercompany";
import PaymentPending from "../pages/reports/PaymentPending";
import CustomerForm from "../pages/customer/CustomerForm";
import CustomerList from "../pages/customer/CustomerList";
import EditCustomer from "../pages/customer/EditCustomer";
import CreditSettings from "../pages/billing/CreditSettings";
import SaleSubmenuView from "../pages/sales/SaleSubmenuView";
import SaleInvoices from "../pages/sales/SaleInvoices";
import PaymentIn from "../pages/sales/payment_in/PaymentIn";
import CreditNoteList from "../pages/sales/credit_note/CreditNoteList";
import AddCreditNote from "../pages/sales/credit_note/AddCreditNote";
import PaymentPendingHistory from "../pages/reports/PaymentPendingHistory";
import PendingCashierRequests from "../pages/CashierRequests/PendingCashierRequests";
import AdminForm from "../pages/Admin/AdminForm";
import AdminList from "../pages/Admin/AdminList";
import EditAdmin from "../pages/Admin/EditAdmin";

import CompanyRequest from "../pages/CompanyRequests/CompanyRequest";
import ChangePassword from "../pages/Admin/ChangePassword";
import BrandForm from "../pages/brand/BrandForm";
import BrandList from "../pages/brand/BrandList";
import EditBrand from "../pages/brand/EditBrand";
import SupplierForm from "../pages/supplier/SupplierForm";
import SupplierList from "../pages/supplier/SupplierList";
import EditSupplier from "../pages/supplier/EditSupplier";
import SupplierAddProductForm from "../pages/SupplierProduct/SupplierAddProductForm";
import SupplierProductList from "../pages/SupplierProduct/SupplierProductList";
import SupplierEditProduct from "../pages/SupplierProduct/SupplierEditProduct";
import PurchaseList from "../pages/purchase/PurchaseList";
import PurchaseForm from "../pages/purchase/PurchaseForm";
import PurchaseGSTReport from "../pages/purchase/PurchaseGSTReport";
import PurchaseSubmenuView from "../pages/purchase/PurchaseSubmenuView";
import PaymentOut from "../pages/purchase/payment_out/PaymentOut";
import DebitNoteList from "../pages/purchase/debit_note/DebitNoteList";
import AddDebitNote from "../pages/purchase/debit_note/AddDebitNote";
import ExpenseList from "../pages/purchase/expenses/ExpenseList";
import AddExpense from "../pages/purchase/expenses/AddExpense";
import TicketList from "../pages/helpdesk/TicketList";
import TicketDetails from "../pages/helpdesk/TicketDetails";
import HelpdeskDashboard from "../pages/helpdesk/HelpdeskDashboard";
import WhatsAppChat from "../pages/whatsapp/WhatsAppChat";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 Public */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/registercompany" element={<RegisterCompany />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ⚡ Standalone Full-Screen Routes (Add Sale, Invoice Preview & Cashier Billing) */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "cashier", "superadmin", "developer"]} />}>
          <Route path="/sales/add" element={<AddSale />} />
          <Route path="/sales/edit/:invoiceNo" element={<AddSale />} />
          <Route path="/sales/credit-note/add" element={<AddCreditNote />} />
          <Route path="/sales/credit-note/edit/:id" element={<AddCreditNote />} />
          <Route path="/purchases/new" element={<PurchaseForm />} />
          <Route path="/purchases/edit/:id" element={<PurchaseForm />} />
          <Route path="/purchases/debit-note/add" element={<AddDebitNote />} />
          <Route path="/purchases/debit-note/edit/:id" element={<AddDebitNote />} />
          <Route path="/purchases/expenses/add" element={<AddExpense />} />
          <Route path="/purchases/expenses/edit/:id" element={<AddExpense />} />
          <Route path="/invoice/:invoiceNo" element={<Invoice />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/billing" element={<Billing />} />
        </Route>



        {/* 🔐 Protected Routes with MainLayout */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "cashier", "superadmin", "developer"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* 1. Common routes allowed for admin, cashier, superadmin, developer */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "cashier", "superadmin", "developer"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to={defaultReportPath} replace />} />
              <Route path="sale" element={<Sale />} />
              <Route path="purchase" element={<Purchase />} />
              <Route path="day-book" element={<DayBook />} />
              <Route path="all-transactions" element={<AllTransactions />} />
              <Route path="profit-loss" element={<ProfitAndLoss />} />
              <Route path="bill-wise-profit" element={<BillWiseProfit />} />
              <Route path="cash-flow" element={<CashFlow />} />
              <Route path="trial-balance" element={<TrialBalance />} />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="party-statement" element={<PartyStatement />} />
              <Route path="party-profit-loss" element={<PartyWiseProfitLoss />} />
              <Route path="all-parties" element={<AllParties />} />
              <Route path="party-by-item" element={<PartyReportByItem />} />
              <Route path="sale-purchase-by-party" element={<SalePurchaseByParty />} />
              <Route path="sale-purchase-by-party-group" element={<SalePurchaseByPartyGroup />} />
            </Route>
            <Route path="/sales/invoices" element={<SaleInvoices />} />
            <Route path="/sales/quotations" element={<SaleSubmenuView type="quotation" title="Estimate / Quotation" />} />
            <Route path="/sales/proforma" element={<SaleSubmenuView type="proforma" title="Proforma Invoice" />} />
            <Route path="/sales/payment-in" element={<PaymentIn />} />
            <Route path="/sales/order" element={<SaleSubmenuView type="order" title="Sale Order" />} />
            <Route path="/sales/delivery-challan" element={<SaleSubmenuView type="challan" title="Delivery Challan" />} />
            <Route path="/sales/credit-note" element={<CreditNoteList />} />
            <Route path="/sales/credit-note/add" element={<AddCreditNote />} />
            <Route path="/sales/credit-note/edit/:id" element={<AddCreditNote />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/payment-pending" element={<PaymentPending />} />
            <Route path="/paymentpending-history" element={<PaymentPendingHistory />} />
            <Route path="/helpdesk" element={<TicketList />} />
            <Route path="/helpdesk/ticket/:id" element={<TicketDetails />} />
            <Route path="/helpdesk/analytics" element={<HelpdeskDashboard />} />
          </Route>

          {/* Cashier and Admin billing route */}
          <Route path="/billing" element={<Billing />} />
        </Route>

          {/* 2. Admin-only routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductForm />} />
            <Route path="/products/edit/:id" element={<EditProduct />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/company" element={<CompanyList />} />
            <Route path="/company/add" element={<CompanyForm />} />
            <Route path="/company/edit/:id" element={<EditCompany />} />
            <Route path="/customer" element={<CustomerList />} />
            <Route path="/customer/add" element={<CustomerForm />} />
            <Route path="/customer/edit/:id" element={<EditCustomer />} />
            <Route path="/cashier/add" element={<CashierForm />} />
            <Route path="/cashier" element={<CashierList />} />
            <Route path="/cashier/edit/:id" element={<EditCashier />} />
            <Route path="/category/add" element={<CategoryForm />} />
            <Route path="/category" element={<CategoryList />} />
            <Route path="/category/edit/:id" element={<EditCategory />} />
            <Route path="/subcategory/add" element={<SubcategoryForm />} />
            <Route path="/subcategory" element={<SubcategoryList />} />
            <Route path="/subcategory/edit/:id" element={<EditSubcategory />} />
            <Route path="/brand/add" element={<BrandForm />} />
            <Route path="/brand" element={<BrandList />} />
            <Route path="/brand/edit/:id" element={<EditBrand />} />
            <Route path="/supplier/add" element={<SupplierForm />} />
            <Route path="/supplier" element={<SupplierList />} />
            <Route path="/supplier/edit/:id" element={<EditSupplier />} />
            <Route path="/supplier/:supplierId/products" element={<SupplierProductList />} />
            <Route path="/supplier/:supplierId/add-product" element={<SupplierAddProductForm />} />
            <Route path="/supplier/:supplierId/products/edit/:id" element={<SupplierEditProduct />} />
            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/new" element={<PurchaseForm />} />
            <Route path="/purchases/edit/:id" element={<PurchaseForm />} />
            <Route path="/purchases/reports" element={<PurchaseGSTReport />} />
            <Route path="/tax" element={<TaxList />} />
            <Route path="/tax/add" element={<TaxForm />} />
            <Route path="/credit-settings" element={<CreditSettings />} />
            <Route path="/whatsapp" element={<WhatsAppChat />} />
          </Route>

          {/* 4. Superadmin-only routes */}
          <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
            <Route path="/admin" element={<AdminList />} />
            <Route path="/admin/add" element={<AdminForm />} />
            <Route path="/admin/edit/:id" element={<EditAdmin />} />
            <Route path="/cashier-requests" element={<PendingCashierRequests />} />
            <Route path="/company-requests" element={<CompanyRequest />} />
          </Route>
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}