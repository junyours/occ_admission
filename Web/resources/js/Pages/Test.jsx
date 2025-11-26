import React, { useState } from 'react';
import { router } from '@inertiajs/react';

export default function Test() {
  const [success, setSuccess] = useState(false);

  const handleInsert = () => {
    router.post('/test/insert', {}, {
      onSuccess: () => setSuccess(true)
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      {success && (
        <div className="mb-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Data inserted successfully!
        </div>
      )}
      
      <button
        onClick={handleInsert}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl shadow-md transition duration-300"
      >
        Insert "Connected" to Database
      </button>
    </div>
  );
}