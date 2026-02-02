import React from "react";
import { useNavigate } from "react-router";

interface FileItemProps {
  fileName: string;
  className?: string;
}

function formatDateFromFileName(fileName: string): string {
  // Extract date from filename format like "2026-01-30:19:07:54" or "2026-01-30"
  const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!dateMatch) {
    return fileName; // Return original if not a date format
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = date.getDate();

  return `${dayName}, ${monthName} ${dayNum}`;
}

function FileItem({ fileName, className }: FileItemProps) {
  const navigate = useNavigate();
  const displayName = formatDateFromFileName(fileName);

  const handleClick = () => {
    navigate(`/file/${encodeURIComponent(fileName)}`);
  };

  return (
    <div
      onClick={handleClick}
      className={className + " border-t-[0.1px] border-[#e2e2e2] h-[70px] flex items-center cursor-pointer hover:bg-gray-50 active:bg-gray-100"}
    >
      <div className="text-[15px]">{displayName}</div>
    </div>
  );
}

export default FileItem;
