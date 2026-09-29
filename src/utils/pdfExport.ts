import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord } from '../types';

export interface ReportFilterOptions {
  type: 'month' | 'teacher' | 'range' | 'all';
  month?: string; // YYYY-MM
  teacherId?: string;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
  statusFilter?: string;
}

export function generateAttendancePDF(
  records: AttendanceRecord[],
  filter: ReportFilterOptions,
  schoolInfo = {
    name: 'SMA NEGERI 1 JULOK',
    address: 'Jl. Medan - Banda Aceh, Km. 360, Desa Julok Tunong, Kec. Julok, Kab. Aceh Timur',
    headmasterName: 'Riza Fani, S.Pd., M.Pd.',
    headmasterNip: '19750812 200212 1 002',
    piketOfficer: 'Cut Mutia, S.Pd.'
  }
) {
  // Orientation: Landscape for rich tabular attendance report
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header / Kop Surat Resmi Pemerintah Aceh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH ACEH', pageWidth / 2, 14, { align: 'center' });
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(13);
  doc.text('CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR', pageWidth / 2, 24, { align: 'center' });
  doc.setFontSize(15);
  doc.text(schoolInfo.name, pageWidth / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(schoolInfo.address, pageWidth / 2, 35, { align: 'center' });

  // Kop Double Horizontal Lines
  doc.setLineWidth(0.8);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setLineWidth(0.3);
  doc.line(14, 39.2, pageWidth - 14, 39.2);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN REKAPITULASI PRESENSI & JURNAL GURU', pageWidth / 2, 46, { align: 'center' });

  // Period / Filter Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let filterText = 'Semua Periode';
  if (filter.type === 'month' && filter.month) {
    const [year, m] = filter.month.split('-');
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    filterText = `Bulan: ${monthNames[parseInt(m, 10) - 1] || m} ${year}`;
  } else if (filter.type === 'teacher' && filter.teacherName) {
    filterText = `Nama Guru: ${filter.teacherName}`;
  } else if (filter.type === 'range' && filter.startDate && filter.endDate) {
    filterText = `Rentang Tanggal: ${filter.startDate} s/d ${filter.endDate}`;
  }

  doc.text(`Kriteria Laporan: ${filterText}`, 14, 52);
  doc.text(`Waktu Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`, pageWidth - 14, 52, { align: 'right' });

  // Calculate statistics
  const total = records.length;
  const hadir = records.filter(r => r.status === 'HADIR').length;
  const sakit = records.filter(r => r.status === 'SAKIT').length;
  const izin = records.filter(r => r.status === 'IZIN').length;
  const dinas = records.filter(r => r.status === 'DINAS_LUAR').length;
  const alpa = records.filter(r => r.status === 'ALPA').length;
  const percentage = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0';

  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 205, 215);
  doc.roundedRect(14, 55, pageWidth - 28, 11, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    `Total Catatan: ${total}   |   Hadir: ${hadir} (${percentage}%)   |   Sakit: ${sakit}   |   Izin: ${izin}   |   Dinas Luar: ${dinas}   |   Alpa: ${alpa}`,
    20,
    62
  );

  // Table Data
  const tableRows = records.map((rec, index) => [
    (index + 1).toString(),
    rec.date,
    rec.timeSlotName.split(' ')[0] + ' ' + (rec.timeSlotName.match(/\((.*?)\)/)?.[1] || rec.timestamp || ''),
    rec.teacherName,
    rec.nip || '-',
    rec.classRoomName,
    rec.subjectName,
    rec.status,
    rec.topic || rec.piketNotes || rec.notes || (rec.recordedBy === 'MANDIRI' ? 'Selfie Valid' : 'Divalidasi Piket')
  ]);

  autoTable(doc, {
    startY: 69,
    head: [['No', 'Tanggal', 'Jam / Waktu', 'Nama Guru', 'NIP', 'Kelas', 'Mata Pelajaran', 'Status', 'Materi / Keterangan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [26, 86, 160], // Navy blue SMA
      textColor: [255, 255, 255],
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 26 },
      3: { cellWidth: 46, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 18 },
      6: { cellWidth: 36 },
      7: { halign: 'center', cellWidth: 22 },
      8: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw as string;
        if (val === 'HADIR') {
          data.cell.styles.textColor = [22, 101, 52]; // Dark green
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'SAKIT' || val === 'IZIN') {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'DINAS_LUAR') {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'ALPA') {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Footer / Signatures
  // @ts-expect-error autoTable adds lastAutoTable to doc
  const finalY = (doc.lastAutoTable?.finalY || 150) + 12;

  // Check if signature fits on current page
  if (finalY + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
  }

  const signY = finalY + 40 > doc.internal.pageSize.getHeight() ? 25 : finalY;
  const leftX = 35;
  const rightX = pageWidth - 65;

  const todayAceh = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Left Sign: Koordinator Guru Piket
  doc.text('Mengetahui / Memeriksa,', leftX, signY, { align: 'center' });
  doc.text('Petugas Guru Piket Harian', leftX, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.piketOfficer, leftX, signY + 28, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(leftX - 30, signY + 29, leftX + 30, signY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. 19801104 200801 2 008', leftX, signY + 34, { align: 'center' });

  // Right Sign: Kepala Sekolah
  doc.text(`Julok, ${todayAceh}`, rightX, signY, { align: 'center' });
  doc.text('Kepala SMA Negeri 1 Julok', rightX, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.headmasterName, rightX, signY + 28, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(rightX - 35, signY + 29, rightX + 35, signY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${schoolInfo.headmasterNip}`, rightX, signY + 34, { align: 'center' });

  // Save the PDF
  const filename = `Laporan_Absensi_SMAN1_Julok_${filter.type}_${Date.now()}.pdf`;
  doc.save(filename);
}
