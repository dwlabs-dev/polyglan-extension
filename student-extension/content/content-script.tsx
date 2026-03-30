import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingPanel from '../src/components/FloatingPanel';

// Inject the React panel into the Meet DOM
const container = document.createElement('div');
container.id = 'polyglan-student-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<FloatingPanel />);

console.log('Polyglan Student extension loaded');
