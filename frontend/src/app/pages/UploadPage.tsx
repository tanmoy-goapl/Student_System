"use client";

export default function UploadPage() {

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Integrations</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Document Management</h3>
            <p className="text-sm text-gray-600">
              Upload and manage your documents in the Documents section.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">API Integrations</h3>
            <p className="text-sm text-gray-600">
              Connect with external services and APIs to enhance your workflow.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Third-Party Services</h3>
            <p className="text-sm text-gray-600">
              Integrate with popular tools and services to streamline your work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
