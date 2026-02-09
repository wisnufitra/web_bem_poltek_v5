import React from "react";

const LayananCard = ({ title, icon, embedUrl }) => {
  return (
    <div style={cardStyle}>
      <h3>{icon} {title}</h3>
      <iframe
        src={embedUrl}
        width="100%"
        height="500"
        frameBorder="0"
        allowFullScreen
        title={title}
        style={{ borderRadius: "10px", border: "1px solid #ccc" }}
      ></iframe>
    </div>
  );
};

const cardStyle = {
  marginBottom: "40px",
  padding: "20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "12px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
};

export default LayananCard;
