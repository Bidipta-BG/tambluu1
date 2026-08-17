import AdminProtectedLayout from "./(protected)/layout";
import AdminDashboardPage from "./(protected)/page";

// We re-export the protected dashboard here to resolve the route conflict
// without needing to delete the file via terminal.
export default async function AdminPage() {
  return (
    <AdminProtectedLayout>
      <AdminDashboardPage />
    </AdminProtectedLayout>
  );
}
