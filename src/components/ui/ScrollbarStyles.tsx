import React from 'react';
const ScrollbarStyles = () => {
  return <style dangerouslySetInnerHTML={{__html: `
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
    `}} />;
};
export default ScrollbarStyles;