import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/dashboard/Dashboard";
import ProductList from "../pages/products/ProductList";
import ProductForm from "../pages/products/ProductForm";
import Billing from "../pages/billing/Billing";
import AddSale from "../pages/sales/AddSale";
import Reports from "../pages/reports/SalesReport";
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

        {/* ⚡ Standalone Full-Screen Routes (Add Sale & Invoice Preview) */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "cashier", "superadmin", "developer"]} />}>
          <Route path="/sales/add" element={<AddSale />} />
          <Route path="/invoice/:invoiceNo" element={<Invoice />} />
          <Route path="/invoice" element={<Invoice />} />
        </Route>

        {/* 🔐 Protected Routes with MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* 1. Common routes allowed for admin, cashier, superadmin, developer */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "cashier", "superadmin", "developer"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sales/invoices" element={<SaleInvoices />} />
            <Route path="/sales/quotations" element={<SaleSubmenuView type="quotation" title="Estimate / Quotation" />} />
            <Route path="/sales/proforma" element={<SaleSubmenuView type="proforma" title="Proforma Invoice" />} />
            <Route path="/sales/payment-in" element={<PaymentPending />} />
            <Route path="/sales/order" element={<SaleSubmenuView type="order" title="Sale Order" />} />
            <Route path="/sales/delivery-challan" element={<SaleSubmenuView type="challan" title="Delivery Challan" />} />
            <Route path="/sales/credit-note" element={<SaleSubmenuView type="credit_note" title="Sale Return / Credit Note" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/payment-pending" element={<PaymentPending />} />
            <Route path="/paymentpending-history" element={<PaymentPendingHistory />} />
            <Route path="/helpdesk" element={<TicketList />} />
            <Route path="/helpdesk/ticket/:id" element={<TicketDetails />} />
            <Route path="/helpdesk/analytics" element={<HelpdeskDashboard />} />
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

          {/* 3. Cashier and Admin billing route */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "cashier"]} />}>
            <Route path="/billing" element={<Billing />} />
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