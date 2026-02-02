import { useEffect, useState } from "react";
import { useMentraAuth } from "@mentra/react";
import FileItem from "../ui/fileItem";

interface File {
  _id: string;
  userEmail: string;
  fileName: string;
  starred: boolean;
  trashed: boolean;
  createdAt: string;
}

export default function Files() {
  const { userId } = useMentraAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchFiles() {
      try {
        setLoading(true);
        const response = await fetch(`/api/files?userEmail=${encodeURIComponent(userId!)}`);
        const data = await response.json();

        if (data.success) {
          setFiles(data.files);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to fetch files");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">All Files</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Files</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="">

      </div>
      <h1 className="text-2xl font-light mb-4 text-[60px]"> All Files</h1>
      <button></button>
      {files.length === 0 ? (
        <p className="text-gray-500">No files yet</p>
      ) : (
        <div className="flex flex-col">
          {files.map((file) => (
            <FileItem key={file._id} fileName={file.fileName} />
          ))}
        </div>
      )}
    </div>
  );
}
