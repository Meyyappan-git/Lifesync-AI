import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FoldersContent from '@/app/dashboard/folders/page'; // Adjust import if default export differs

// Mock next/navigation's useSearchParams
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}));

// Mock apiClient
const mockFolders = [
  { folder_id: 1, folder_name: 'Personal Passports', completion_pct: 100, doc_count: 2, missing_docs: [] },
  { folder_id: 2, folder_name: 'Medical Records', completion_pct: 100, doc_count: 1, missing_docs: [] }
];

const mockDocs = {
  folder: mockFolders[0],
  documents: [
    { id: 101, name: 'Passport_Scan_Main.pdf', file_type: 'pdf', created_at: '2024-01-01T00:00:00Z', metadata: { expiry_date: '2031-05-12' } },
    { id: 102, name: 'Entry_Visa_NYC.pdf', file_type: 'pdf', created_at: '2024-02-01T00:00:00Z', metadata: { expiry_date: '2027-01-01' } }
  ]
};

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn((url) => {

      if (url === '/api/v1/lifesync/folders') {
        return Promise.resolve(mockFolders);
      }
      if (url.startsWith('/api/v1/lifesync/folders/')) {
        return Promise.resolve(mockDocs);
      }
      return Promise.resolve();
    })
  }
}));

describe('FoldersContent component', () => {
  test('opens folder and displays its documents', async () => {
    render(<FoldersContent />);

    // Wait for folders to load
    const folderCard = await screen.findByText('Personal Passports');
    expect(folderCard).toBeInTheDocument();

    // Click the folder
    fireEvent.click(folderCard);

    // Loading indicator for documents should appear
    expect(screen.getByText(/Loading folder documents.../i)).toBeInTheDocument();

    // Wait for documents to appear
    const doc1 = await screen.findByText('Passport_Scan_Main.pdf');
    const doc2 = await screen.findByText('Entry_Visa_NYC.pdf');
    expect(doc1).toBeInTheDocument();
    expect(doc2).toBeInTheDocument();
  });
});
