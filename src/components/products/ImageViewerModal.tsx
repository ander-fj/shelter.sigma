import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { X } from "lucide-react";

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

export default function ImageViewerModal({
  isOpen,
  imageUrl,
  imageAlt,
  onClose,
}: ImageViewerModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Visualizar Imagem</DialogTitle>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>
        <div className="flex justify-center items-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt}
              className="max-h-[70vh] rounded shadow"
            />
          ) : (
            <p className="text-gray-500">Nenhuma imagem disponível</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
