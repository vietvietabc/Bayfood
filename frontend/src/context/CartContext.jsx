import React, { createContext, use, useState } from 'react';

const CartContext = createContext();

export const useCart = () => use(CartContext);

const readStoredTableId = () => {
  const value = localStorage.getItem('selectedTableId');
  const parsed = value ? Number(value) : null;
  return Number.isFinite(parsed) ? parsed : null;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [selectedTableId, setSelectedTableIdState] = useState(() => readStoredTableId());
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderThoiGianDen, setEditingOrderThoiGianDen] = useState(null);

  const setCartFromOrder = (items, orderId, thoiGianDen = null) => {
    setCart(items);
    setEditingOrderId(orderId);
    setEditingOrderThoiGianDen(thoiGianDen);
  };

  const setSelectedTableId = (tableId) => {
    const normalized = tableId ? Number(tableId) : null;
    setSelectedTableIdState(normalized);

    if (normalized) {
      localStorage.setItem('selectedTableId', String(normalized));
    } else {
      localStorage.removeItem('selectedTableId');
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id_monAn === item.id_monAn);
      if (existing) {
        return prev.map((i) =>
          i.id_monAn === item.id_monAn
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id_monAn !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id_monAn === id) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : i;
        }
        return i;
      })
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + (item.giaTien * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        selectedTableId,
        setSelectedTableId,
        editingOrderId,
        setEditingOrderId,
        editingOrderThoiGianDen,
        setEditingOrderThoiGianDen,
        setCartFromOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
