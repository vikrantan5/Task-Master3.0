import React from 'react';

const colors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorSelect }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <div className="grid grid-cols-4 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              selectedColor === color ? 'border-gray-400 ring-2 ring-gray-300' : 'border-gray-200'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;