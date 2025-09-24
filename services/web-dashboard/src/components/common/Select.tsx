import React, { useState } from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            value,
            onValueChange,
            isOpen,
            setIsOpen
          });
        }
        return child;
      })}
    </div>
  );
};

interface SelectTriggerProps {
  children: React.ReactNode;
  value?: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  isOpen, 
  setIsOpen 
}) => {
  return (
    <button
      type="button"
      onClick={() => setIsOpen?.(!isOpen)}
      className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <div className="flex items-center justify-between">
        {children}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );
};

interface SelectValueProps {
  value?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ value }) => {
  return <span>{value}</span>;
};

interface SelectContentProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}

export const SelectContent: React.FC<SelectContentProps> = ({ 
  children, 
  isOpen, 
  onValueChange, 
  setIsOpen 
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
      <div className="py-1">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as any, {
              onValueChange,
              setIsOpen
            });
          }
          return child;
        })}
      </div>
    </div>
  );
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}

export const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  children, 
  onValueChange, 
  setIsOpen 
}) => {
  const handleClick = () => {
    onValueChange?.(value);
    setIsOpen?.(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
    >
      {children}
    </button>
  );
};