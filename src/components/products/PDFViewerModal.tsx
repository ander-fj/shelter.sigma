import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { X } from "lucide-react";

interface PDFViewerModalProps {
  isOpen: boolean;
  pdfUrl: string;
  pdfName: string;
  onClose: () => void;
}

export default function PDFViewerModal({
  isOpen,
  pdfUrl,
  pdfName,
  onClose,
}: PDFViewerModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{pdfName || "Visualizar PDF"}</DialogTitle>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        <div className="flex-1 h-full">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={pdfName}
              className="w-full h-[70vh] rounded border"
            />
          ) : (
            <p className="text-gray-500">Nenhum documento disponível</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
