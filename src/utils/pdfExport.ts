import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, SchoolLogos, Teacher } from '../types';
import { loadImageAsDataUrl } from './imageUtils';
import { analyzeRecordLateness } from './latenessHelper';

export interface ReportFilterOptions {
  type: 'month' | 'teacher' | 'range' | 'all';
  month?: string; // YYYY-MM
  teacherId?: string;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
  statusFilter?: string;
}

export interface SchoolReportInfo {
  name?: string;
  address?: string;
  headmasterName?: string;
  headmasterNip?: string;
  curriculumViceName?: string;
  curriculumViceNip?: string;
  piketOfficer?: string;
}

export async function generateAttendancePDF(
  records: AttendanceRecord[],
  filter: ReportFilterOptions,
  schoolInfo: SchoolReportInfo = {
    name: 'SMA NEGERI 1 JULOK',
    address: 'Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457',
    headmasterName: 'Irmi, S.Pd, M.Pd',
    headmasterNip: '19800102 200504 2 001',
    curriculumViceName: 'Desi Muliana, S.Pd',
    curriculumViceNip: '19862025212030'
  },
  logos?: SchoolLogos,
  teachers?: Teacher[]
) {
  // Orientation: Landscape for rich tabular attendance report
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Render Official Logo in Kop Surat (Single Logo: Pemerintah Aceh)
  if (logos?.acehLogo) {
    try {
      const acehDataUrl = await loadImageAsDataUrl(logos.acehLogo, 160, 180);
      if (acehDataUrl && acehDataUrl.startsWith('data:image')) {
        doc.addImage(acehDataUrl, 'PNG', 16, 9, 21, 25);
      }
    } catch (e) {
      console.warn('Could not add Aceh logo to PDF Kop Surat:', e);
    }
  }

  // Header / Kop Surat Resmi Pemerintah Aceh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH ACEH', pageWidth / 2, 14, { align: 'center' });
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(13);
  doc.text('CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR', pageWidth / 2, 24, { align: 'center' });
  doc.setFontSize(15);
  doc.text(schoolInfo.name || 'SMA NEGERI 1 JULOK', pageWidth / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(schoolInfo.address || 'Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457', pageWidth / 2, 35, { align: 'center' });

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
  const lateCount = records.filter(r => analyzeRecordLateness(r).isLate).length;
  const onTimeCount = hadir - lateCount;
  const sakit = records.filter(r => r.status === 'SAKIT').length;
  const izin = records.filter(r => r.status === 'IZIN').length;
  const dinas = records.filter(r => r.status === 'DINAS_LUAR').length;
  const alpa = records.filter(r => r.status === 'ALPA').length;
  const percentage = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0';

  const unattendedTeachers =
    teachers && (!filter.statusFilter || filter.statusFilter.toUpperCase() === 'ALL') && filter.type !== 'teacher'
      ? teachers.filter((t) => t.status === 'Aktif' && !records.some((r) => r.teacherId === t.id))
      : [];

  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 205, 215);
  doc.roundedRect(14, 55, pageWidth - 28, 11, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const unattendedSummary = teachers ? `   |   Tidak Absen: ${unattendedTeachers.length}` : '';
  doc.text(
    `Total: ${total}   |   Hadir Tepat: ${onTimeCount}   |   Telat: ${lateCount}   |   Sakit/Izin: ${sakit + izin}   |   Dinas: ${dinas}   |   Alpa: ${alpa}${unattendedSummary}   |   Presensi: ${percentage}%`,
    20,
    62
  );

  // Format status and jam for each record
  function formatPdfStatus(rec: AttendanceRecord): { jamAndStatus: string; isLate: boolean; isAbsent: boolean } {
    let jamText = '';
    if (rec.timestamp) {
      const match = rec.timestamp.match(/(\d{1,2})[.:](\d{2})/);
      if (match) jamText = `${match[1].padStart(2, '0')}:${match[2]}`;
      else jamText = rec.timestamp;
    }

    let statusLabel = 'Hadir';
    let isLate = false;
    let isAbsent = false;

    if (rec.status === 'HADIR') {
      const lateness = analyzeRecordLateness(rec);
      if (lateness.isLate) {
        isLate = true;
        statusLabel = lateness.lateMinutes > 0
          ? `[TELAT +${lateness.lateMinutes}m]`
          : '[TELAT]';
      } else {
        statusLabel = 'Hadir';
      }
    } else if (rec.status === 'ALPA') {
      isAbsent = true;
      statusLabel = 'Absen';
    } else if (rec.status === 'SAKIT') {
      isAbsent = true;
      statusLabel = 'Sakit';
    } else if (rec.status === 'IZIN') {
      isAbsent = true;
      statusLabel = 'Izin';
    } else {
      statusLabel = 'Dinas Luar';
    }

    const jamAndStatus = jamText ? `${jamText} WIB\n${statusLabel}` : statusLabel;
    return { jamAndStatus, isLate, isAbsent };
  }

  // Table Data
  const tableRows = records.map((rec, index) => {
    const statusData = formatPdfStatus(rec);
    const hasPhoto = Boolean(rec.photoUrl && rec.photoUrl.startsWith('data:image'));
    const rawSlot = rec.timeSlotName || '-';
    const slotFormatted = rawSlot.includes('(') ? rawSlot.replace('(', '\n(') : rawSlot;

    return [
      (index + 1).toString(),
      rec.date,
      slotFormatted,
      rec.teacherName,
      rec.nip || '-',
      rec.classRoomName,
      rec.subjectName,
      statusData.jamAndStatus,
      hasPhoto ? '' : 'Tanpa Foto'
    ];
  });

  autoTable(doc, {
    startY: 69,
    head: [['No', 'Tanggal', 'Jam Mengajar & Waktu', 'Nama Guru', 'NIP', 'Kelas', 'Mata Pelajaran', 'Jam Absen & Status', 'Foto Selfie']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [26, 86, 160], // Navy blue SMA
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center',
      valign: 'middle'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak',
      minCellHeight: 16
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 28 },
      3: { cellWidth: 42, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 18 },
      6: { cellWidth: 36 },
      7: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 24 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw || '');
        if (val.includes('Hadir') && !val.includes('TELAT') && !val.includes('Telat')) {
          data.cell.styles.textColor = [22, 101, 52]; // Dark green
        } else if (val.includes('TELAT') || val.includes('Telat')) {
          data.cell.styles.textColor = [225, 29, 72]; // Vivid Red for warning
          data.cell.styles.fillColor = [254, 242, 242]; // Subtle red background
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('Absen') || val.includes('Alpa')) {
          data.cell.styles.textColor = [185, 28, 28]; // Red
        } else if (val.includes('Sakit') || val.includes('Izin')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        } else if (val.includes('Dinas')) {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
        }
      }
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.raw || '');
        if (val === 'Tanpa Foto') {
          data.cell.styles.textColor = [148, 163, 184]; // Gray
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const rec = records[data.row.index];
        if (rec?.photoUrl && rec.photoUrl.startsWith('data:image')) {
          try {
            const imgSize = 13;
            const imgX = data.cell.x + (data.cell.width - imgSize) / 2;
            const imgY = data.cell.y + (data.cell.height - imgSize) / 2;
            doc.addImage(rec.photoUrl, 'JPEG', imgX, imgY, imgSize, imgSize);
          } catch {
            // Ignore malformed image
          }
        }
      }
    }
  });

  // Section: Daftar Guru & Staff yang Tidak Melakukan Absensi
  if (unattendedTeachers.length > 0) {
    // @ts-expect-error autoTable adds lastAutoTable to doc
    let nextY = (doc.lastAutoTable?.finalY || 150) + 10;
    if (nextY + 30 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text(
      `DAFTAR GURU & STAFF YANG TIDAK MELAKUKAN ABSENSI (${unattendedTeachers.length} Orang)`,
      14,
      nextY
    );
    doc.setTextColor(0, 0, 0);

    const unattendedRows = unattendedTeachers.map((t, idx) => {
      const catLabel =
        t.category === 'GURU_BK'
          ? 'Guru BK (Harian)'
          : t.category === 'STAFF_TU'
          ? 'Staff TU (Harian)'
          : 'Guru Mata Pelajaran';
      return [
        (idx + 1).toString(),
        t.name,
        t.nip || '-',
        catLabel,
        t.jabatan || '-',
        'Tidak / Belum Melakukan Absensi'
      ];
    });

    autoTable(doc, {
      startY: nextY + 4,
      head: [['No', 'Nama Guru / Staff', 'NIP', 'Kategori', 'Jabatan', 'Keterangan']],
      body: unattendedRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 38 },
        3: { halign: 'center', cellWidth: 38 },
        4: { cellWidth: 45 },
        5: { halign: 'center', cellWidth: 50, textColor: [185, 28, 28], fontStyle: 'bold' }
      }
    });
  }

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

  // Left Sign: Wakil Kepala Kurikulum
  doc.text('Mengetahui,', leftX, signY, { align: 'center' });
  doc.text('Wakil Kepala Kurikulum', leftX, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  const leftOfficerName = schoolInfo.curriculumViceName || 'Desi Muliana, S.Pd';
  doc.text(leftOfficerName, leftX, signY + 28, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(leftX - 35, signY + 29, leftX + 35, signY + 29);
  doc.setFont('helvetica', 'normal');
  const leftOfficerNip = schoolInfo.curriculumViceNip || '19862025212030';
  doc.text(`NIP. ${leftOfficerNip}`, leftX, signY + 34, { align: 'center' });

  // Right Sign: Kepala Sekolah
  doc.text(`Julok, ${todayAceh}`, rightX, signY, { align: 'center' });
  doc.text('Kepala SMA Negeri 1 Julok', rightX, signY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  const rightOfficerName = schoolInfo.headmasterName || 'Irmi, S.Pd, M.Pd';
  doc.text(rightOfficerName, rightX, signY + 28, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(rightX - 35, signY + 29, rightX + 35, signY + 29);
  doc.setFont('helvetica', 'normal');
  const rightOfficerNip = schoolInfo.headmasterNip || '19800102 200504 2 001';
  doc.text(`NIP. ${rightOfficerNip}`, rightX, signY + 34, { align: 'center' });

  // Save the PDF
  const filename = `Laporan_Absensi_SMAN1_Julok_${filter.type}_${Date.now()}.pdf`;
  doc.save(filename);
}
