import React from 'react';
const ScrollbarStyles = () => {
  return <style jsx global>{`
      /* Hide scrollbar for Chrome, Safari and Opera */
      ::-webkit-scrollbar {
        display: none;
      }
      /* Hide scrollbar for IE, Edge and Firefox */
      * {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
      }
      /* Ensure overflow containers still scroll */
      .overflow-x-auto,
      .overflow-y-auto,
      .overflow-auto {
        overflow: auto;
      }
    `}</style>;
};
export default ScrollbarStyles;