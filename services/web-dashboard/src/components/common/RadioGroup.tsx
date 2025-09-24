import React from 'react';

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  children,
  className = ''
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            selectedValue: value,
            onValueChange
          });
        }
        return child;
      })}
    </div>
  );
};

interface RadioGroupItemProps {
  value: string;
  id: string;
  selectedValue?: string;
  onValueChange?: (value: string) => void;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  selectedValue,
  onValueChange
}) => {
  const isSelected = selectedValue === value;

  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={isSelected}
      onChange={() => onValueChange?.(value)}
      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
    />
  );
};