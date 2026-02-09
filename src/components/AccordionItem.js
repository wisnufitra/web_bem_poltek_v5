// src/components/AccordionItem.js
import React, { useState } from 'react';

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: "100%", textAlign: "left", padding: "16px", backgroundColor: "#004d40", color: "white", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "18px" }}
      >
        {title} {isOpen ? '⬆️' : '⬇️'}
      </button>
      {isOpen && <div style={{ padding: "16px", backgroundColor: "white" }}>{children}</div>}
    </div>
  );
};

export default AccordionItem;