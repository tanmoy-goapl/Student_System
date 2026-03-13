"use client";

export default function HomePage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome to Mentor AI</h2>
      <p className="text-gray-600 mb-4">
        Your intelligent learning companion. Upload your study materials, ask questions, and get
        focused, AI-powered guidance tailored to your own documents.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📚 Upload Documents</h3>
          <p className="text-sm text-gray-600">
            Upload PDF, TXT, or DOCX files such as notes, question papers, or syllabi to get started.
          </p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">💬 Ask Questions</h3>
          <p className="text-sm text-gray-600">
            Chat with Mentor AI about the topics inside your documents and clarify your doubts.
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">🎯 Get Answers</h3>
          <p className="text-sm text-gray-600">
            Receive targeted explanations, weak-area analysis, and study suggestions based only on
            your content.
          </p>
        </div>
      </div>
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">How to get the best results</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Upload all relevant documents for the subject you want help with.</li>
          <li>Ask specific questions (for example: &quot;Which chapters am I weak in for math?&quot;).</li>
          <li>Use the Chat page to refine your study plan and track what you have completed.</li>
        </ul>
      </div>
    </div>
  );
}
