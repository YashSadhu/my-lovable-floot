import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from './Sheet';
import { Button } from './Button';
import { Input } from './Input';
import { Spinner } from './Spinner';
import { Save } from 'lucide-react';

interface SaveProjectSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (title: string) => void;
  isSaving: boolean;
}

export const SaveProjectSheet = ({ isOpen, onOpenChange, onSave, isSaving }: SaveProjectSheetProps) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Save Your Project</SheetTitle>
          <SheetDescription>
            Give your project a title to save it for later. You can access it from the "My Projects" list.
          </SheetDescription>
        </SheetHeader>
        <div style={{ padding: 'var(--spacing-6)' }}>
          <label htmlFor="project-title" style={{ fontWeight: 500, marginBottom: 'var(--spacing-2)', display: 'block' }}>
            Project Title
          </label>
          <Input
            id="project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., My Awesome Cat Toy Store"
            disabled={isSaving}
          />
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving ? <Spinner size="sm" /> : <Save size={16} />}
            Save Project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};