import TopBar from "@/components/layout/topbar";
import BulkClientManager from "@/components/bulk/bulk-client-manager";

export default function BulkClientManagement() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Bulk Client Management" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Client Management</h1>
          <p className="text-gray-600 mt-2">Import, export, and manage client data in bulk operations</p>
        </div>
        <BulkClientManager />
      </div>
    </div>
  );
}