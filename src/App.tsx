////////////////////////////////////////////////////////////////////////////
////////////..........SECTOR 1: Imports y tipos...........//////////////////
///////////////////////////////////////////////////////////////////////////
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Interfaces (Sector 1 - sin cambios)
interface ExtraItem {
  nombre: string;
  importe: string;
}

interface Categoria {
  id: string;
  nombre: string;
  subcategorias: string[];
  icono?: string;
  color?: string;
  tipo?: 'gasto' | 'ingreso';
}

interface Campo {
  id: string;
  nombre: string;
  porcentaje: number;
  emoji?: string;
  icono?: string;
  color?: string;
  tipo?: 'inversion';
  categorias: Categoria[];
}

// Función getIcon con emojis (Sector 1 - sin cambios)
export function getIcon(name: string): string {
  const emojiMap: Record<string, string> = {
    dinero: '💰',
    casa: '🏠',
    auto: '🚗',
    seguridad: '🛡️',
    avion: '✈️',
    disfrute: '🎉',
    money: '💸',
    education: '📚',
    entertainment: '🎬',
    pet: '🐶',
    work: '💼',
    bank: '🏦',
    card: '💳',
    coin: '🪙',
    chart: '📈',
    crypto: '₿',
    wallet: '👛',
    piggy: '🐷',
    shop: '🛍️',
    dollar: '💵',
    food: '🍔',
    health: '🏥',
    gift: '🎁',
    travel: '✈️',
  };
  return emojiMap[name] || '❓';
}

/////////////////////////////////////////////////////////////////////////////////////////////
///////////////...SECTOR 2: Componentes de entrada de dinero (MoneyInput).../////////////////
////////////////////////////////////////////////////////////////////////////////////////////

// ============================
// Helper component for ARS money input
// ============================
function MoneyInput({
  value,
  onChange,
  className = "",
  placeholder = "$0,00",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const normalizeNumber = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d]/g, "")) / 100;
  };

  const formatLive = (raw: string): string => {
    if (!raw) return "";
    const num = normalizeNumber(raw);
    return num.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    });
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatLive(value)}
      onChange={(e: { target: { value: string; }; }) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  );
}

// ============================
// Helper component for USD money input
// ============================
function MoneyInputUsd({
  value,
  onChange,
  className = "",
  placeholder = "USD 0.00",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const normalizeNumber = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d]/g, "")) / 100;
  };

  const formatLive = (raw: string): string => {
    if (!raw) return "";
    const num = normalizeNumber(raw);
    return "USD " + num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <input
      type="text"
      value={formatLive(value)}
      onChange={(e: { target: { value: string; }; }) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  );
}

///////////////////////////////////////////////////////////////////////////////////////////////
//////////......... SECTOR 3: Componente Accordion (actualizado) ....... /////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

function Accordion({
  title,
  emoji,
  total,
  saldo,
  isOpen,
  onToggle,
  children,
  darkMode,
  used,
  totalBudget,
  campo,
  onEdit,
  onDelete,
  onIconChange,
  onColorChange,
}: {
  title: string;
  emoji?: string;
  total: string;
  saldo: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  darkMode: boolean;
  used: number;
  totalBudget: number;
  campo: Campo;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onIconChange: (icono: string) => void;
  onColorChange: (color: string) => void;
}) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const percentage =
    totalBudget > 0 ? Math.min(100, Math.max(0, (used / totalBudget) * 100)) : 0;
  const isOverBudget = used > totalBudget;

  const MenuDropdown = () => {
    const [isOpenMenu, setIsOpenMenu] = useState(false);

    // Obtener posición del botón para posicionar el menú
    const positionMenu = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 80; // Altura aproximada del menú (2 botones + padding)
        const menuWidth = 120; // Ancho aproximado del menú
        let topPos = rect.height + 4; // Justo debajo del botón
        let leftPos = 0; // Posición inicial relativa al botón

        // Ajustar si el menú se sale por la parte inferior
        if (rect.bottom + menuHeight > window.innerHeight) {
          topPos = -(menuHeight + 4); // Mostrarlo arriba del botón si no cabe abajo
        }

        // Ajustar si el menú se sale por la derecha
        if (rect.right + menuWidth > window.innerWidth) {
          leftPos = -(menuWidth - (window.innerWidth - rect.right));
        } else if (rect.left < 0) {
          leftPos = -rect.left; // Ajuste si está cerca del borde izquierdo
        }

        return {
          top: topPos,
          left: leftPos,
        };
      }
      return { top: 0, left: 0 };
    };

    return (
      <div className="relative menu-dropdown" style={{ zIndex: 1001 }}>
        <button
          ref={buttonRef}
          onClick={(e: { stopPropagation: () => void; }) => {
            e.stopPropagation();
            setIsOpenMenu(!isOpenMenu);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-opacity ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
            }`}
          aria-label="Opciones del campo"
        >
          <span className="text-lg">⋮</span>
        </button>
        {isOpenMenu && (
          <div
            className={`absolute min-w-[80px] max-w-[120px] min-h-[60px] p-2 rounded shadow-lg overflow-visible ${darkMode ? "bg-gray-800/90 text-white border-gray-600" : "bg-white/90 text-gray-800 border-gray-300"
              } border`}
            style={{
              top: `${positionMenu().top}px`,
              left: `${positionMenu().left}px`,
            }}
          >
            <button
              onClick={(e: { stopPropagation: () => void; }) => {
                e.stopPropagation();
                onEdit();
                setIsOpenMenu(false);
              }}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded block"
            >
              Editar
            </button>
            <button
              onClick={(e: { stopPropagation: () => void; }) => {
                e.stopPropagation();
                if (confirm(`¿Estás seguro de eliminar el campo "${title}"?`)) {
                  onDelete(campo.id);
                }
                setIsOpenMenu(false);
              }}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded block mt-1"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Paleta de colores pastel
  const extendedColors = [
    '#ba9df4', '#e2e37e', '#bf9780', '#FFB6C1', '#FFA07A',
    '#E0BBE4', '#E6E6FA', '#D291BC', '#A7C7E7', '#c7f7f7',
    '#ecd6c0', '#a788ab', '#AAF0D1', '#B0E0A8', '#C9E4CA',
    '#FFFFBA', '#5dc460', '#ff6565', '#888a8a', '#acf7c3',
  ];

  // Lista completa de íconos con 4 nuevos añadidos
  const icons = [
    { name: 'dinero', label: 'Dinero' },
    { name: 'casa', label: 'Casa' },
    { name: 'auto', label: 'Auto' },
    { name: 'seguridad', label: 'Seguridad' },
    { name: 'avion', label: 'Viajes' },
    { name: 'disfrute', label: 'Disfrute' },
    { name: 'money', label: 'Billetes' },
    { name: 'education', label: 'Educación' },
    { name: 'entertainment', label: 'Entretenimiento' },
    { name: 'pet', label: 'Mascota' },
    { name: 'work', label: 'Trabajo' },
    { name: 'bank', label: 'Banco' },
    { name: 'card', label: 'Tarjeta' },
    { name: 'coin', label: 'Moneda' },
    { name: 'chart', label: 'Gráfico' },
    { name: 'crypto', label: 'Cripto' },
    { name: 'wallet', label: 'Billetera' },
    { name: 'piggy', label: 'Alcancía' },
    { name: 'shop', label: 'Compras' },
    { name: 'dollar', label: 'Dólar' },
    { name: 'food', label: 'Comida' },
    { name: 'health', label: 'Salud' },
    { name: 'gift', label: 'Regalo' },
    { name: 'travel', label: 'Turismo' },
  ];

  return (
    <div
      className={`rounded-xl mb-4 transition-all duration-300 ease-out ${isOpen
        ? "scale-[1.01] ring-1 ring-white/10"
        : "scale-[1.005]"
        } ${darkMode
          ? "bg-gray-800 text-white shadow-inner"
          : "bg-white border border-gray-200"
        }`}
      style={{
        // Solo para modo claro (más contraste)
        boxShadow: darkMode
          ? '0 6px 24px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(0, 0, 0, 0.3)'
          : '0 4px 16px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.1)',
        outline: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div
            onClick={(e: { stopPropagation: () => void; }) => {
              e.stopPropagation();
              setShowIconPicker(true);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: campo.color || extendedColors[0] }} // Usa el color del campo o el primero de la paleta
          >
            <span className="text-white text-xl">{getIcon(campo.icono || 'question')}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base truncate">{title}</h2>
            <p className="text-xs">Total disponible: {total}</p>
            <p
              className={`text-xs font-semibold ${parseFloat(saldo.replace(/[^\d,-]/g, "")) < 0
                ? "text-red-500"
                : "text-green-400"
                }`}
            >
              Saldo restante: {saldo}
            </p>
          </div>
        </div>

        <div className="relative overflow-visible z-10">
          <MenuDropdown />
        </div>
      </button>

      {showIconPicker && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-lg mb-4 w-full max-w-2xl mx-auto`}>
          <h3 className="text-xl font-bold mb-4 text-center">Seleccionar ícono y color</h3>
          <div className="mb-4">
            <label className={`block mb-2 font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>Íconos</label>
            <div className="grid grid-cols-6 gap-3 justify-center">
              {icons.map(icon => (
                <button
                  key={icon.name}
                  onClick={() => {
                    onIconChange(icon.name);
                    setShowIconPicker(false);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${campo.icono === icon.name ? (darkMode ? 'bg-blue-600 border-2 border-blue-400' : 'bg-green-100 border-2 border-green-500') : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200')
                    }`}
                >
                  <span className="text-lg">{getIcon(icon.name)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label className={`block mb-2 font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>Colores</label>
            <div className="flex justify-center gap-3 flex-wrap">
              {extendedColors.map(color => (
                <button
                  key={color}
                  onClick={() => {
                    onColorChange(color);
                    setShowIconPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${campo.color === color ? 'ring-4 ring-offset-2 ring-blue-500' : ''
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {totalBudget > 0 && campo.nombre !== "Fondo de Seguridad" && (
        <div className="px-3 pb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
              {percentage.toFixed(0)}% usado
            </span>
          </div>
          <div
            className={`w-full h-1 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
          >
            <div
              className={`h-full rounded-full ${isOverBudget
                ? "bg-red-500"
                : percentage > 80
                  ? "bg-yellow-500"
                  : "bg-blue-500"
                }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-600 ease-in-out ${isOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div
          className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"
            }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////.......SECTOR 4: Componente de edición de campo (actualizado con más íconos y fondo oscuro)....../////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ============================
// Componente reutilizable: Selector de ícono y color (dropdown)
// ============================
function IconColorDropdown({
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
  theme,
}: {
  selectedIcon: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  theme: any;
}) {
  // Lista expandida con todos los íconos de emojiMap para llenar filas de 6 (agregué los faltantes)
  const icons = [
    { name: 'dinero', label: 'Dinero' },
    { name: 'casa', label: 'Casa' },
    { name: 'auto', label: 'Auto' },
    { name: 'seguridad', label: 'Seguridad' },
    { name: 'avion', label: 'Viajes' },
    { name: 'disfrute', label: 'Disfrute' },
    { name: 'money', label: 'Billetes' },
    { name: 'education', label: 'Educación' },
    { name: 'entertainment', label: 'Entretenimiento' },
    { name: 'pet', label: 'Mascota' },
    { name: 'work', label: 'Trabajo' },
    { name: 'bank', label: 'Banco' },
    { name: 'card', label: 'Tarjeta' },
    { name: 'coin', label: 'Moneda' },
    { name: 'chart', label: 'Gráfico' },
    { name: 'crypto', label: 'Cripto' },
    { name: 'wallet', label: 'Billetera' },
    { name: 'piggy', label: 'Alcancía' },
    { name: 'shop', label: 'Compras' },
    { name: 'dollar', label: 'Dólar' },
  ];

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FFDAB9', '#B5EAD7', '#C7CEEA', '#F8B195'
  ];

  return (
    <div className={`p-4 rounded-xl ${theme.darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-lg mb-4 w-full max-w-lg mx-auto`}> {/* Añadí w-full max-w-lg para expandir ancho */}
      <h3 className="text-xl font-bold mb-4 text-center">Seleccionar ícono y color</h3>

      {/* Íconos - Filas de 6 */}
      <div className="mb-6">
        <label className={`block mb-2 font-semibold ${theme.darkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>Símbolos</label>
        <div className="flex justify-center overflow-x-auto">
          <div className="grid grid-cols-6 gap-5"> {/* 6 columnas, gap mayor para separar */}
            {icons.map(icon => (
              <button
                key={icon.name}
                onClick={() => onIconChange(icon.name)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${ /* Tamaño reducido para caber 6, hover para interactividad */
                  selectedIcon === icon.name
                    ? `${theme.darkMode ? 'bg-blue-600 border-2 border-blue-400' : 'bg-green-100 border-2 border-green-500'}`
                    : `${theme.darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
                  }`}
              >
                {getIcon(icon.name).startsWith('/') ? (
                  <img
                    src={getIcon(icon.name)}
                    alt={icon.label}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <span className="text-lg">{getIcon(icon.name)}</span> /* Texto más pequeño */
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Colores - También expandido */}
      <div className="mb-4">
        <label className={`block mb-2 font-semibold ${theme.darkMode ? 'text-gray-300' : 'text-gray-700'} text-center`}>Color</label>
        <div className="flex justify-center gap-3 flex-wrap">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${ /* Tamaño aumentado para colores */
                selectedColor === color
                  ? 'ring-4 ring-offset-2 ring-blue-500'
                  : ''
                }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================
// Formulario de edición de campo (reutilizable) — CORREGIDO
// ============================
function CampoEditForm({
  campo,
  onSave,
  onCancel,
  theme,
}: {
  campo: Campo;
  onSave: (updated: Campo) => void;
  onCancel: () => void;
  theme: any;
}) {
  const [campoLocal, setCampoLocal] = useState<Campo>({ ...campo });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState<Record<string, string>>({});

  const addCategoria = () => {
    setCampoLocal(prev => ({
      ...prev,
      categorias: [
        ...prev.categorias,
        {
          id: Date.now().toString(),
          nombre: "",
          subcategorias: [],
          icono: 'question',
          color: '#607D8B',
        }
      ]
    }));
  };

  const updateCategoria = (idx: number, updates: Partial<Categoria>) => {
    setCampoLocal(prev => {
      const nuevas = [...prev.categorias];
      nuevas[idx] = { ...nuevas[idx], ...updates };
      return { ...prev, categorias: nuevas };
    });
  };

  const removeCategoria = (idx: number) => {
    setCampoLocal(prev => {
      const nuevas = [...prev.categorias];
      nuevas.splice(idx, 1);
      return { ...prev, categorias: nuevas };
    });
  };

  const addSubcategoria = (catIdx: number, nombre: string) => {
    if (!nombre.trim()) return;
    setCampoLocal(prev => {
      const nuevas = [...prev.categorias];
      nuevas[catIdx].subcategorias = [...nuevas[catIdx].subcategorias, nombre.trim()];
      return { ...prev, categorias: nuevas };
    });
  };

  const removeSubcategoria = (catIdx: number, subIdx: number) => {
    setCampoLocal(prev => {
      const nuevas = [...prev.categorias];
      nuevas[catIdx].subcategorias.splice(subIdx, 1);
      return { ...prev, categorias: nuevas };
    });
  };

  const handleSave = () => {
    if (campoLocal.nombre && campoLocal.porcentaje > 0) {
      onSave(campoLocal);
    }
  };

  return (
    <div className={`w-full p-4 rounded-xl ${theme.card}`}>
      {/* Selector de ícono/color (solo si se activa) */}
      {showIconPicker && (
        <IconColorDropdown
          selectedIcon={campoLocal.icono || 'shopping-cart'}
          selectedColor={campoLocal.color || '#FF6B6B'}
          onIconChange={(icon: any) => setCampoLocal({ ...campoLocal, icono: icon })}
          onColorChange={(color: any) => setCampoLocal({ ...campoLocal, color: color })}
          theme={theme}
        />
      )}

      {/* Nombre del campo */}
<div className="mb-3">
  <label className={theme.label}>Nombre del campo:</label>
  <input
    type="text"
    value={campoLocal.nombre}
    onChange={(e) => setCampoLocal({ ...campoLocal, nombre: e.target.value })}
    placeholder="Ej: Gastos para vivir"
    className={`w-full p-2 rounded ${theme.input}`}
  />
</div>

      {showIconPicker && (
        <IconColorDropdown
          selectedIcon={campoLocal.icono || 'shopping-cart'}
          selectedColor={campoLocal.color || '#FF6B6B'}
          onIconChange={(icon: any) => setCampoLocal({ ...campoLocal, icono: icon })}
          onColorChange={(color: any) => setCampoLocal({ ...campoLocal, color: color })}
          theme={theme}
        />
      )}

      {/* Porcentaje */}
      <div className={`p-3 rounded-xl ${theme.darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-3`}>
        <div className="flex items-center gap-2 mb-4">
          <label className={theme.label}>Porcentaje asignado:</label>
          <input
            type="number"
            value={campoLocal.porcentaje === 0 ? "" : campoLocal.porcentaje}
            onChange={(e: { target: { value: string; }; }) => setCampoLocal({ ...campoLocal, porcentaje: parseInt(e.target.value) || 0 })}
            min="0"
            max="100"
            className={`w-20 p-2 rounded ${theme.input}`}
          />
          <span>%</span>
        </div>

        {/* Categorías y subcategorías — CORREGIDO: envuelto en .map */}
        {campoLocal.categorias.map((cat, idx) => (
          <div key={cat.id} className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            {/* Título: Categoría */}
            <h4 className={`font-medium text-sm mb-1 ${theme.label}`}>Categoría</h4>

            {/* Input de categoría - en su propia línea */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cat.nombre}
                  onChange={(e: { target: { value: any; }; }) => updateCategoria(idx, { nombre: e.target.value })}
                  placeholder="Nombre de la categoría"
                  className={`w-full p-2 rounded ${theme.input}`}
                />
                <button
                  onClick={() => removeCategoria(idx)}
                  className="p-1 rounded hover:opacity-80 flex items-center justify-center"
                >
                  <img
                    src="/images/cruzeliminar.png"
                    alt="Eliminar"
                    className="w-10 h-10 object-contain"
                  />
                </button>
              </div>
            </div>

            {/* Título: Subcategorías */}
            <h4 className={`font-medium text-sm mb-2 mt-2 ${theme.label}`}>Subcategorías</h4>

            {/* Lista de subcategorías */}
            {cat.subcategorias.length === 0 ? (
              <p className={`text-sm ${theme.sublabel} italic mb-2`}>No hay subcategorías</p>
            ) : (
              cat.subcategorias.map((sub, subIdx) => (
                <div key={subIdx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={sub}
                    onChange={(e: { target: { value: string; }; }) => {
                      const nuevas = [...campoLocal.categorias];
                      nuevas[idx].subcategorias[subIdx] = e.target.value;
                      setCampoLocal({ ...campoLocal, categorias: nuevas });
                    }}
                    className={`flex-1 p-2 rounded ${theme.input} text-sm`}
                    placeholder="Nombre de la subcategoría"
                  />
                  <button
                    onClick={() => removeSubcategoria(idx, subIdx)}
                    className="p-1 rounded hover:opacity-80 flex items-center justify-center"
                  >
                    <img
                      src="/images/cruzeliminar.png"
                      alt="Eliminar subcategoría"
                      className="w-10 h-10 object-contain"
                    />
                  </button>
                </div>
              ))
            )}

            {/* Nueva subcategoría */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nueva subcategoría"
                value={nuevaSubcategoria[cat.id] || ""}
                onChange={(e: { target: { value: any; }; }) => setNuevaSubcategoria({ ...nuevaSubcategoria, [cat.id]: e.target.value })}
                onKeyDown={(e: { key: string; }) => {
                  if (e.key === "Enter") {
                    const value = (nuevaSubcategoria[cat.id] || "").trim();
                    if (value) {
                      addSubcategoria(idx, value);
                      setNuevaSubcategoria({ ...nuevaSubcategoria, [cat.id]: "" });
                    }
                  }
                }}
                className={`flex-1 p-2 rounded ${theme.input} text-sm`}
              />
              <button
                onClick={() => {
                  const value = (nuevaSubcategoria[cat.id] || "").trim();
                  if (value) {
                    addSubcategoria(idx, value);
                    setNuevaSubcategoria({ ...nuevaSubcategoria, [cat.id]: "" });
                  }
                }}
                className="p-1 rounded hover:opacity-80 flex items-center justify-center"
              >
                <img
                  src="/images/botonazul.png"
                  alt="Agregar"
                  className="w-10 h-10 object-contain"
                />
              </button>
            </div>
          </div>
        ))}



        {/* Botón "Agregar categoría" - versión profesional */}
        <button
          onClick={addCategoria}
          className={`w-full py-2 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${theme.darkMode
            ? "bg-gray-700 text-white hover:bg-gray-600 shadow-lg hover:shadow-xl"
            : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-md hover:shadow-lg"
            }`}
          style={{
            boxShadow: theme.darkMode
              ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.05)'
              : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
          }}
        >
          <span className="text-xl">➕</span>
          <span>Agregar categoría</span>
        </button>

        {/* Botones "Guardar cambios" y "Cancelar" - versión profesional */}
        <div className="flex flex-col gap-2 pt-4 w-full">
          <button
            onClick={handleSave}
            className={`w-full py-2 px-4 rounded-xl font-medium transition-all duration-300 ${theme.darkMode
              ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-xl"
              : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
              }`}
            style={{
              boxShadow: theme.darkMode
                ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.05)'
                : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
            }}
          >
            Guardar cambios
          </button>
          <button
            onClick={onCancel}
            className={`w-full py-2 px-4 rounded-xl font-medium transition-all duration-300 ${theme.darkMode
              ? "bg-red-700 text-white hover:bg-red-600 shadow-lg hover:shadow-xl"
              : "bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg"
              }`}
            style={{
              boxShadow: theme.darkMode
                ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.05)'
                : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// SECTOR 5: Componente principal App (completo y corregido con enrutamiento)////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ============================
// Componente principal protegido
// ============================
function ProtectedApp({ user }: { user: any }) {
  const [darkMode, setDarkMode] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lluvias, setLluvias] = useState<number[]>([]);

  useEffect(() => {
    if (typeof document !== "undefined" && document.body) {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes moneyRain {
        0%   { transform: translateY(0) rotate(0deg);   opacity: 0.9; }
        100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
      }
      .animate-money-rain {
        animation: moneyRain linear infinite;
        animation-fill-mode: both;
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const theme = {
    page: darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-800",
    card: darkMode ? "bg-gray-800 text-white" : "bg-white shadow-md rounded-xl border border-gray-200",
    title: darkMode ? "text-blue-400" : "text-blue-600",
    input:
      (darkMode
        ? "border-gray-600 bg-gray-700 text-white"
        : "border-gray-300 bg-white text-gray-900") +
      " focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    label: darkMode ? "text-gray-300" : "text-gray-700",
    sublabel: darkMode ? "text-gray-400" : "text-gray-600",
    darkMode,
  };

  // ===== Estados iniciales =====
  const [anio, setAnio] = useState("2025");
  const [mes, setMes] = useState("01");
  const [campos, setCampos] = useState<Campo[]>([
    {
      id: "1",
      nombre: "Gastos para Vivir",
      porcentaje: 50,
      icono: "home",
      color: "#4ECDC4",
      categorias: [
        { id: "1-1", nombre: "Casa", subcategorias: ["alquiler", "agua", "luz", "gas", "tasa", "internet", "telefono"], icono: "home", color: "#4ECDC4" },
        { id: "1-2", nombre: "Tarjeta de crédito", subcategorias: ["tarjeta"], icono: "credit-card", color: "#45B7D1" },
        { id: "1-3", nombre: "Auto", subcategorias: ["patente", "seguro"], icono: "car", color: "#96CEB4" },
        { id: "1-4", nombre: "Moto", subcategorias: ["patente", "seguro"], icono: "motorcycle", color: "#FFEAA7" },
        { id: "1-5", nombre: "Varios", subcategorias: ["calistenia"], icono: "question", color: "#DDA0DD" },
      ]
    },
    {
      id: "2",
      nombre: "Inversión",
      porcentaje: 30,
      icono: "savings",
      color: "#FF6B6B",
      tipo: "inversion",
      categorias: [
        { id: "2-1", nombre: "Compra USD Banco", subcategorias: ["usd_banco"], icono: "bank", color: "#FF6B6B" },
        { id: "2-2", nombre: "Invertir Online (IOL)", subcategorias: ["iol_mep", "iol_sp500"], icono: "chart-line", color: "#F8B195" },
        { id: "2-3", nombre: "Otro", subcategorias: ["otro_inversion"], icono: "question", color: "#C7CEEA" },
      ]
    },
    {
      id: "3",
      nombre: "Disfrute",
      porcentaje: 10,
      icono: "entertainment",
      color: "#E91E63",
      categorias: [
        { id: "3-1", nombre: "Actividades", subcategorias: ["calistenia"], icono: "muscle", color: "#E91E63" },
      ]
    },
    {
      id: "4",
      nombre: "Fondo de Seguridad",
      porcentaje: 10,
      icono: "savings",
      color: "#009688",
      categorias: []
    },
  ]);
  const [sueldoRaw, setSueldoRaw] = useState<string>("");
  const [gastosDetalleRaw, setGastosDetalleRaw] = useState<Record<string, string>>({});
  const [inversionPesosRaw, setInversionPesosRaw] = useState<Record<string, string>>({});
  const [inversionUsd, setInversionUsd] = useState<Record<string, string>>({});
  const [extraGastos, setExtraGastos] = useState<ExtraItem[]>([]);
  const [extraInversion, setExtraInversion] = useState<ExtraItem[]>([]);
  const [extraDisfrute, setExtraDisfrute] = useState<ExtraItem[]>([]);

  // ===== Cargar datos desde Firestore =====
  useEffect(() => {
    const loadUserData = async () => {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setAnio(data.anio || "2025");
        setMes(data.mes || "01");
        setCampos(data.campos || campos);
        setSueldoRaw(data.sueldoRaw || "");
        setGastosDetalleRaw(data.gastosDetalleRaw || {});
        setInversionPesosRaw(data.inversionPesosRaw || {});
        setInversionUsd(data.inversionUsd || {});
        setExtraGastos(data.extraGastos || []);
        setExtraInversion(data.extraInversion || []);
        setExtraDisfrute(data.extraDisfrute || {});
      }
    };
    loadUserData();
  }, [user.uid]);

  // ===== Guardar datos en Firestore (con debounce) =====
  useEffect(() => {
    const periodo = `${anio}-${mes}`;
    const timer = setTimeout(async () => {
      await setDoc(doc(db, "usuarios", user.uid), {
        anio,
        mes,
        campos,
        sueldoRaw,
        gastosDetalleRaw,
        inversionPesosRaw,
        inversionUsd,
        extraGastos,
        extraInversion,
        extraDisfrute,
        finanzas: {
          [periodo]: {
            sueldoRaw,
            gastosDetalleRaw,
            inversionPesosRaw,
            inversionUsd,
            extraGastos,
            extraInversion,
            extraDisfrute,
          }
        }
      }, { merge: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [user.uid, anio, mes, campos, sueldoRaw, gastosDetalleRaw, inversionPesosRaw, inversionUsd, extraGastos, extraInversion, extraDisfrute]);

  const anios = ["2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];
  const meses = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];
  const periodo = `${anio}-${mes}`;

  const handleIconChange = (campoId: string, newIcon: string) => {
    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === campoId ? { ...campo, icono: newIcon } : campo
      )
    );
  };

  const handleColorChange = (campoId: string, newColor: string) => {
    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === campoId ? { ...campo, color: newColor } : campo
      )
    );
  };

  const normalizeNumber = (val: string): number =>
    val ? parseFloat(val.replace(/[^\d]/g, "")) / 100 : 0;

  const formatLive = (raw: string): string =>
    raw
      ? (parseFloat(raw.replace(/[^\d]/g, "")) / 100).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
      })
      : "";

  const sueldo = normalizeNumber(sueldoRaw);

  const montosPorCampo = campos.reduce((acc, campo) => {
    acc[campo.id] = sueldo * (campo.porcentaje / 100);
    return acc;
  }, {} as Record<string, number>);

  const calcularTotalesYSaldos = () => {
    const resultados: Record<string, { total: number; saldo: number; cargado: number }> = {};
    campos.forEach(campo => {
      let totalCargado = 0;
      campo.categorias.forEach(cat => {
        cat.subcategorias.forEach(sub => {
          const uniqueKey = `${cat.id}-${sub}`;
          if (campo.tipo === "inversion") {
            totalCargado += normalizeNumber(inversionPesosRaw[uniqueKey] || "0");
          } else {
            totalCargado += normalizeNumber(gastosDetalleRaw[uniqueKey] || "0");
          }
        });
      });
      if (campo.nombre === "Disfrute") {
        totalCargado += extraDisfrute.reduce((sum, item) => sum + normalizeNumber(item.importe), 0);
      } else if (campo.tipo === "inversion") {
        totalCargado += extraInversion.reduce((sum, item) => sum + normalizeNumber(item.importe), 0);
      } else if (campo.nombre === "Gastos para Vivir") {
        totalCargado += extraGastos.reduce((sum, item) => sum + normalizeNumber(item.importe), 0);
      }
      const totalDisponible = montosPorCampo[campo.id] || 0;
      resultados[campo.id] = {
        total: totalDisponible,
        saldo: totalDisponible - totalCargado,
        cargado: totalCargado
      };
    });
    return resultados;
  };

  const resultados = calcularTotalesYSaldos();

  const formatCurrency = (valor: number) =>
    valor.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    });

  const totalPorcentaje = campos.reduce((sum, campo) => sum + campo.porcentaje, 0);
  const porcentajeValido = Math.abs(totalPorcentaje - 100) < 0.1;

  const Lluvia = React.memo(function Lluvia({
    id,
    onDone,
    duracionMs = 6000,
  }: {
    id: number;
    onDone: (id: number) => void;
    duracionMs?: number;
  }) {
    const coins = React.useMemo(
      () =>
        Array.from({ length: 60 }).map(() => {
          const duration = 2.5 + Math.random() * 2.5;
          const delay = -Math.random() * duration;
          return {
            top: `-${20 + Math.random() * 30}vh`,
            left: `${Math.random() * 100}vw`,
            delay: `${delay}s`,
            duration: `${duration}s`,
          };
        }),
      []
    );

    React.useEffect(() => {
      const t = setTimeout(() => onDone(id), duracionMs);
      return () => clearTimeout(t);
    }, [id, onDone, duracionMs]);

    return (
      <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
        {coins.map((c: { top: any; left: any; delay: any; duration: any; }, i: any) => (
          <div
            key={i}
            className="absolute text-4xl animate-money-rain"
            style={{
              top: c.top,
              left: c.left,
              animationDelay: c.delay,
              animationDuration: c.duration,
              opacity: 0.9,
              willChange: "transform, opacity",
            }}
          >
            💵
          </div>
        ))}
      </div>
    );
  });

  const FixedControls = () => {
    return (
      <>
        <div
          onClick={() => {
            const id = Date.now();
            setLluvias((prev) => [...prev, id]);
          }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[100000] cursor-pointer text-3xl hover:scale-110 transition-transform"
          style={{ color: "#FFD700", pointerEvents: "auto" }}
          aria-label="Activar lluvia de billetes"
        >
          💵
        </div>
        {lluvias.map((id) => (
          <Lluvia
            key={id}
            id={id}
            duracionMs={6000}
            onDone={(finId: number) => setLluvias((prev) => prev.filter((x) => x !== finId))}
          />
        ))}
        <div className="absolute top-3 right-4 z-[100000] md:top-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${darkMode ? "text-yellow-400 hover:text-yellow-500" : "text-gray-700 hover:text-gray-800"
              }`}
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </>
    );
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              darkMode={darkMode}
              theme={theme}
              meses={meses}
              mounted={mounted}
              FixedControls={FixedControls}
              anio={anio}
              setAnio={setAnio}
              mes={mes}
              setMes={setMes}
              sueldoRaw={sueldoRaw}
              setSueldoRaw={setSueldoRaw}
              formatLive={formatLive}
            />
          }
        />
        <Route
          path="/budget"
          element={
            <BudgetPage
              darkMode={darkMode}
              theme={theme}
              meses={meses}
              mounted={mounted}
              FixedControls={FixedControls}
              campos={campos}
              setCampos={setCampos}
              open={open}
              setOpen={setOpen}
              editandoId={editandoId}
              setEditandoId={setEditandoId}
              handleIconChange={handleIconChange}
              handleColorChange={handleColorChange}
              gastosDetalleRaw={gastosDetalleRaw}
              setGastosDetalleRaw={setGastosDetalleRaw}
              inversionPesosRaw={inversionPesosRaw}
              setInversionPesosRaw={setInversionPesosRaw}
              inversionUsd={inversionUsd}
              setInversionUsd={setInversionUsd}
              extraGastos={extraGastos}
              setExtraGastos={setExtraGastos}
              extraInversion={extraInversion}
              setExtraInversion={setExtraInversion}
              extraDisfrute={extraDisfrute}
              setExtraDisfrute={setExtraDisfrute}
              calcularTotalesYSaldos={calcularTotalesYSaldos}
              formatCurrency={formatCurrency}
              normalizeNumber={normalizeNumber}
              formatLive={formatLive}
              anio={anio}
              mes={mes}
              sueldoRaw={sueldoRaw}
            />
          }
        />
      </Routes>
    </Router>
  );
}

// Página de login
function LoginScreen() {
  const { login, loading } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-6">Gestor de Finanzas</h1>
        <button
          onClick={login}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#fff" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}

// Componente envoltorio
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!user) return <LoginScreen />;
  return <ProtectedApp user={user} />;
}

// Componente principal
export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Página 1: HomePage (Entrada de datos)
function HomePage({ darkMode, theme, meses, mounted, FixedControls, anio, setAnio, mes, setMes, sueldoRaw, setSueldoRaw, formatLive }) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const handleSubmit = () => {
    navigate('/budget');
  };

  return (
    <>
      {mounted && document.body && createPortal(<FixedControls />, document.body)}
      <div
        className={`flex flex-col items-center ${theme.page} pt-10 md:pt-12`}
        style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}
      >
        {/* Botón de ayuda (signo de interrogación) */}
        <div
          onClick={() => setShowHelp(true)}
          className="absolute top-4 left-4 z-[100000] cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/50 hover:bg-gray-700/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 group"
          style={{ pointerEvents: "auto" }}
          aria-label="Ayuda: Cómo usar la app"
        >
          <span className="text-xl text-white group-hover:text-blue-300">❓</span>
        </div>
        <div className="p-4 md:p-6 w-full max-w-4xl mx-auto">
          <section
            className="w-full flex items-center justify-center"
            style={{ minHeight: "55vh" }}
          >
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <h1 className={`text-2xl md:text-3xl font-bold mb-2 mt-8 ${theme.title}`}>
                  Gestor de Finanzas Personales
                </h1>
                <p className={`text-sm md:text-lg ${theme.sublabel} mt-1 max-w-md mx-auto`}>
                  Controla tu dinero, mes a mes, sin complicaciones.
                </p>
              </div>
              {/* Selector de año y mes */}
              <div className="mb-6 w-full flex gap-4">
                <div className="flex-1">
                  <label className={`block mb-2 font-semibold ${theme.label} text-sm`}>
                    Año:
                  </label>
                  <select
                    value={anio}
                    onChange={(e: { target: { value: any; }; }) => setAnio(e.target.value)}
                    className={`w-full p-2 md:p-3 border rounded-xl shadow ${theme.input}`}
                  >
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                    <option value="2030">2030</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className={`block mb-2 font-semibold ${theme.label} text-sm`}>
                    Mes:
                  </label>
                  <select
                    value={mes}
                    onChange={(e: { target: { value: any; }; }) => setMes(e.target.value)}
                    className={`w-full p-2 md:p-3 border rounded-xl shadow ${theme.input}`}
                  >
                    {meses.map((m: { value: any; label: any; }) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Sueldo */}
              <div className={`mb-6 w-full p-4 md:p-6 rounded-xl shadow ${theme.card}`}>
                <label className={`block mb-2 md:mb-3 font-semibold ${theme.label}`}>
                  Ingresá tu sueldo mensual:
                </label>
                <input
                  type="text"
                  value={formatLive(sueldoRaw)}
                  onChange={(e: { target: { value: string; }; }) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setSueldoRaw(digits);
                  }}
                  placeholder="$0,00"
                  className={`w-full p-3 border rounded-lg shadow-sm ${theme.input}`}
                />
              </div>
              {/* Botón Enviar */}
              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Enviar
              </button>
            </div>
          </section>
        </div>
      </div>
      {/* Modal de ayuda */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl p-6 shadow-2xl ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              }`}
            onClick={(e: { stopPropagation: () => any; }) => e.stopPropagation()}
            style={{
              boxShadow: darkMode
                ? '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.05)'
                : '0 10px 30px rgba(0, 0, 0, 0.25), 0 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center">¿Cómo usar esta app?</h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <div>
                <h3 className="font-bold text-lg mb-1">🏠 Gastos para vivir (50%)</h3>
                <p>
                  Este frasco cubre todos los gastos esenciales para mantener un nivel de vida básico. Incluye alquiler o hipoteca, alimentos, transporte (nafta o boletos de autobús) y servicios básicos como luz, agua e internet. También abarca seguros médicos o de hogar necesarios. El objetivo es priorizar las necesidades sin superar el 50% del ingreso mensual.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">💰 Inversión (25%)</h3>
                <p>
                  Este frasco se dedica a construir riqueza a largo plazo mediante inversiones consistentes. Se enfoca en activos como fondos indexados o ETFs (ej. S&P 500) que crecen con el interés compuesto. El propósito es hacer que el dinero genere rendimientos con el tiempo. La clave es diversificar y mantener la disciplina. Esto impulsa la libertad financiera.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">🎉 Disfrute (15%)</h3>
                <p>
                  Este frasco permite gastos personales que enriquecen la vida, como salir a comer, viajar o hobbies. Su propósito es mantener un equilibrio entre ahorro y disfrute para evitar frustraciones. Se recomienda no exceder el 15% del ingreso para no desbalancear el presupuesto. La idea es planificar estos gastos con intención. Esto motiva a seguir la estrategia financiera. Ejemplo: un cine o un pequeño capricho.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">🛡️ Fondo de seguridad (10%)</h3>
                <p>
                  Este frasco crea un colchón financiero para emergencias, como gastos médicos o pérdida de empleo. Su objetivo es cubrir 3-6 meses de gastos para vivir, ofreciendo tranquilidad. Esto protege contra imprevistos sin recurrir a deudas. Es clave para la estabilidad financiera.
                </p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Estilos globales para la animación */}
      <style jsx global>{`
        @keyframes money-rain {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
        }
        .animate-money-rain {
          animation: money-rain linear forwards;
          animation-fill-mode: both;
        }
      `}</style>
    </>
  );
}

// Página 2: BudgetPage (Presupuesto con acordeones)
function BudgetPage({
  darkMode,
  theme,
  meses,
  mounted,
  FixedControls,
  campos,
  setCampos,
  open,
  setOpen,
  editandoId,
  setEditandoId,
  handleIconChange,
  handleColorChange,
  gastosDetalleRaw,
  setGastosDetalleRaw,
  inversionPesosRaw,
  setInversionPesosRaw,
  inversionUsd,
  setInversionUsd,
  extraGastos,
  setExtraGastos,
  extraInversion,
  setExtraInversion,
  extraDisfrute,
  setExtraDisfrute,
  calcularTotalesYSaldos,
  formatCurrency,
  normalizeNumber,
  formatLive,
  anio,
  mes,
  sueldoRaw,
}) {
  const navigate = useNavigate();
  const mesLabel = meses.find((m: { value: any; }) => m.value === mes)?.label || "Mes";
  const resultados = calcularTotalesYSaldos();
  return (
    <>
      {mounted && document.body && createPortal(<FixedControls />, document.body)}
      <div
        className={`flex flex-col items-center ${theme.page} pt-10 md:pt-12`}
        style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}
      >
        <div className="p-4 md:p-6 w-full max-w-4xl mx-auto pb-10">
          <div className="text-center mb-6">
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 mt-8 ${theme.title}`}>
              Presupuesto para {mesLabel} {anio}
            </h1>
          </div>
          {/* Botón de vuelta a la izquierda (profesional y moderno) */}
          <div
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 z-[100000] cursor-pointer flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 group"
            style={{ pointerEvents: "auto" }}
            aria-label="Volver a la página principal"
          >
            {/* Flecha SVG (estilizada y nítida) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 text-white group-hover:text-blue-300 transition-colors duration-300"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          {/* Resultados (acordeones) */}
          <div className="w-full max-w-4xl">
            {campos.map((campo: { id: string | number; nombre: string; icono: string; categorias: any[]; tipo: string; }) => {
              const resultado = resultados[campo.id] || { total: 0, saldo: 0, cargado: 0 };
              const isOpen = open === campo.id;
              return (
                <Accordion
                  key={campo.id}
                  title={campo.nombre}
                  emoji={campo.icono ? getIcon(campo.icono) : undefined}
                  total={formatCurrency(resultado.total)}
                  saldo={formatCurrency(resultado.saldo)}
                  isOpen={isOpen}
                  onToggle={() => setOpen(isOpen ? null : campo.id)}
                  darkMode={darkMode}
                  used={resultado.cargado}
                  totalBudget={resultado.total}
                  campo={campo}
                  onEdit={() => {
                    setOpen(campo.id);
                    setEditandoId(campo.id);
                  }}
                  onDelete={(id: any) => {
                    setCampos(campos.filter((c: { id: any; }) => c.id !== id));
                    if (editandoId === id) setEditandoId(null);
                  }}
                  onIconChange={(newIcon: any) => handleIconChange(campo.id, newIcon)}
                  onColorChange={(newColor: any) => handleColorChange(campo.id, newColor)}
                >
                  {editandoId === campo.id ? (
                    <CampoEditForm
                      campo={campo}
                      onSave={(updated: any) => {
                        setCampos(campos.map((c: { id: any; }) => c.id === campo.id ? updated : c));
                        setEditandoId(null);
                      }}
                      onCancel={() => setEditandoId(null)}
                      theme={theme}
                    />
                  ) : (
                    <>
                      {/* Categorías */}
                      {campo.categorias.length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg mb-3">Categorías</h3>
                          {campo.categorias.map((categoria: { id: any; nombre: any; subcategorias: any[]; }) => (
                            <div
                              key={categoria.id}
                              className={`mb-3 p-3 ${darkMode ? "bg-gray-700" : "bg-white"
                                } rounded-lg border ${darkMode ? "border-gray-600" : "border-gray-200"
                                } transition-shadow duration-200`}
                              style={{
                                boxShadow: darkMode
                                  ? '0 4px 12px rgba(0, 0, 0, 0.5)'
                                  : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                              }}
                            >
                              <h4 className="font-medium text-base mb-2 flex items-center gap-2">
                                {categoria.nombre}
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {categoria.subcategorias.map((subcategoria: string, index: any) => (
                                  <div key={`${categoria.id}-${index}`} className="w-full flex items-start gap-1 mb-2">
                                    <div className="flex-1">
                                      <label className={`block text-xs mb-1 capitalize ${theme.sublabel}`}>
                                        {subcategoria.replace(/_/g, " ")}
                                      </label>
                                      {campo.tipo === "inversion" ? (
                                        <>
                                          <MoneyInput
                                            value={inversionPesosRaw[`${categoria.id}-${subcategoria}`] || ""}
                                            onChange={(v: string) => {
                                              const digits = v.replace(/\D/g, "");
                                              setInversionPesosRaw({
                                                ...inversionPesosRaw,
                                                [`${categoria.id}-${subcategoria}`]: digits
                                              });
                                            }}
                                            className={`w-full p-2 border rounded ${theme.input}`}
                                            placeholder="$0,00 (Pesos)"
                                          />
                                          <label className={`block text-xs mt-1 mb-1 capitalize ${theme.sublabel}`}>
                                            {subcategoria.replace(/_/g, " ")} (USD)
                                          </label>
                                          <MoneyInputUsd
                                            value={inversionUsd[`${categoria.id}-${subcategoria}`] || ""}
                                            onChange={(v: string) => {
                                              const digits = v.replace(/\D/g, "");
                                              setInversionUsd({
                                                ...inversionUsd,
                                                [`${categoria.id}-${subcategoria}`]: digits
                                              });
                                            }}
                                            className={`w-full p-2 border rounded ${theme.input} text-sm`}
                                          />
                                        </>
                                      ) : (
                                        <input
                                          type="text"
                                          value={formatLive(gastosDetalleRaw[`${categoria.id}-${subcategoria}`] || "")}
                                          onChange={(e: { target: { value: string; }; }) => {
                                            const digits = e.target.value.replace(/\D/g, "");
                                            setGastosDetalleRaw({
                                              ...gastosDetalleRaw,
                                              [`${categoria.id}-${subcategoria}`]: digits,
                                            });
                                          }}
                                          placeholder="$0,00"
                                          className={`w-full p-2 border rounded ${theme.input}`}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Extras según campo */}
                      {campo.nombre === "Gastos para Vivir" && (
                        <>
                          {extraGastos.map((item: { nombre: any; importe: any; }, idx: string | number) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 sm:items-center">
                              <input
                                type="text"
                                placeholder="Concepto"
                                value={item.nombre}
                                onChange={(e: { target: { value: any; }; }) => {
                                  const updated = [...extraGastos];
                                  updated[idx].nombre = e.target.value;
                                  setExtraGastos(updated);
                                }}
                                className={`flex-1 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <input
                                type="text"
                                placeholder="Importe"
                                value={formatLive(item.importe)}
                                onChange={(e: { target: { value: string; }; }) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  const updated = [...extraGastos];
                                  updated[idx].importe = digits;
                                  setExtraGastos(updated);
                                }}
                                className={`w-full sm:w-28 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <button
                                onClick={() => setExtraGastos(extraGastos.filter((_: any, i: any) => i !== idx))}
                                className="px-2 py-1 bg-red-600 text-white rounded shadow self-end sm:self-auto"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setExtraGastos([...extraGastos, { nombre: "", importe: "" }])}
                            className="mt-2 px-3 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition text-sm"
                          >
                            + Agregar gasto extra
                          </button>
                        </>
                      )}
                      {campo.tipo === "inversion" && (
                        <>
                          {extraInversion.map((item: { nombre: any; importe: any; }, idx: string | number) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 sm:items-center">
                              <input
                                type="text"
                                placeholder="Concepto"
                                value={item.nombre}
                                onChange={(e: { target: { value: any; }; }) => {
                                  const updated = [...extraInversion];
                                  updated[idx].nombre = e.target.value;
                                  setExtraInversion(updated);
                                }}
                                className={`flex-1 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <MoneyInputUsd
                                value={item.importe}
                                onChange={(v: string) => {
                                  const digits = v.replace(/\D/g, "");
                                  const updated = [...extraInversion];
                                  updated[idx].importe = digits;
                                  setExtraInversion(updated);
                                }}
                                className={`w-full sm:w-28 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <button
                                onClick={() =>
                                  setExtraInversion(extraInversion.filter((_: any, i: any) => i !== idx))
                                }
                                className="px-2 py-1 bg-red-600 text-white rounded shadow self-end sm:self-auto"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setExtraInversion([...extraInversion, { nombre: "", importe: "" }])
                            }
                            className="mt-2 px-3 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition text-sm"
                          >
                            + Agregar inversión extra
                          </button>
                        </>
                      )}
                      {campo.nombre === "Disfrute" && (
                        <>
                          {extraDisfrute.map((item: { nombre: any; importe: any; }, idx: string | number) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2 sm:items-center">
                              <input
                                type="text"
                                placeholder="Concepto"
                                value={item.nombre}
                                onChange={(e: { target: { value: any; }; }) => {
                                  const updated = [...extraDisfrute];
                                  updated[idx].nombre = e.target.value;
                                  setExtraDisfrute(updated);
                                }}
                                className={`flex-1 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <input
                                type="text"
                                placeholder="Importe"
                                value={formatLive(item.importe)}
                                onChange={(e: { target: { value: string; }; }) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  const updated = [...extraDisfrute];
                                  updated[idx].importe = digits;
                                  setExtraDisfrute(updated);
                                }}
                                className={`w-full sm:w-28 min-w-0 p-2 border rounded ${theme.input}`}
                              />
                              <button
                                onClick={() => setExtraDisfrute(extraDisfrute.filter((_: any, i: any) => i !== idx))}
                                className="px-2 py-1 bg-red-600 text-white rounded shadow self-end sm:self-auto"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setExtraDisfrute([...extraDisfrute, { nombre: "", importe: "" }])}
                            className="mt-2 px-3 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition text-sm"
                          >
                            + Agregar
                          </button>
                        </>
                      )}
                      {campo.nombre === "Fondo de Seguridad" && (
                        <p className="text-lg">{formatCurrency(resultado.total)}</p>
                      )}
                    </>
                  )}
                </Accordion>
              );
            })}
            {/* Botón para nuevo campo - versión profesional */}
            <div className="mb-10 mt-4">
              <button
                onClick={() => {
                  const nuevoCampo: Campo = {
                    id: "new-" + Date.now(),
                    nombre: "",
                    porcentaje: 0,
                    categorias: [],
                    icono: "plus",
                    color: "#607D8B"
                  };
                  setCampos([...campos, nuevoCampo]);
                  setOpen(nuevoCampo.id);
                  setEditandoId(nuevoCampo.id);
                }}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${darkMode
                  ? "bg-gray-700 text-white hover:bg-gray-600 shadow-lg hover:shadow-xl"
                  : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-md hover:shadow-lg"
                  }`}
                style={{
                  boxShadow: darkMode
                    ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.05)'
                    : '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                }}
              >
                <span className="text-xl">➕</span>
                <span>Nuevo campo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
