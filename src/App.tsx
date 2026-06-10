import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Building2, Smartphone, BrainCircuit, Database, Upload, CheckCircle2, AlertCircle, Info, Calendar } from 'lucide-react';

// Webhook URL untuk Power Automate (sementara dikosongkan/dummy)
const POST_WEBHOOK_URL = 'https://default9cc6d9f3fc434e1785825c8fbcab8b.ef.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4766d2917f074b28b517e312719da27e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=dO9G4VxohZX1lNMCmOqo5L-44d4VHN55qjw6QRDE5gU';

// Webhook URL untuk GET data jadwal (Flow Power Automate ke-2)
const GET_WEBHOOK_URL = 'https://default9cc6d9f3fc434e1785825c8fbcab8b.ef.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9128e7abdbc748af90eefa2cec6b75c6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GVitF0RY-c4cd1i5sAk7RT0XYK26I5ujzoZOQozMUZs';

type FormData = {
  nama: string;
  kategori: string;
  email: string;
  lab: string;
  tanggal: string;
  sesi: string;
  keperluan: string;
  fileBase64: string;
  fileName: string;
};

// Tipe data untuk jadwal yang sudah ada di Excel
type Schedule = {
  [key: string]: any; // Mengizinkan properti dinamis seperti "Tanggal & Jam"
};

const initialFormData: FormData = {
  nama: '',
  kategori: 'Organisasi',
  email: '',
  lab: 'MIS',
  tanggal: '',
  sesi: 'Sesi 1',
  keperluan: '',
  fileBase64: '',
  fileName: ''
};

const labs = [
  { id: 'MIS', name: 'MIS Lab', icon: <Building2 className="w-8 h-8 mb-4 text-purple-500" />, desc: 'Management Information System' },
  { id: 'Mobile', name: 'Mobile Lab', icon: <Smartphone className="w-8 h-8 mb-4 text-blue-500" />, desc: 'Mobile App Development' },
  { id: 'AI', name: 'AI Lab', icon: <BrainCircuit className="w-8 h-8 mb-4 text-rose-500" />, desc: 'Artificial Intelligence & ML' },
  { id: 'Big Data', name: 'Big Data Lab', icon: <Database className="w-8 h-8 mb-4 text-amber-500" />, desc: 'Data Analytics & Processing' }
];

function App() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [bookedSchedules, setBookedSchedules] = useState<Schedule[]>([]);

  // Fungsi untuk mengambil data jadwal dari Power Automate
  const fetchSchedules = async () => {
    if (!GET_WEBHOOK_URL) return; // Abaikan jika belum ada URL
    
    try {
      const response = await fetch(GET_WEBHOOK_URL, { mode: 'cors' });
      if (response.ok) {
        const data = await response.json();
        console.log("Data Excel yang diterima:", data); // Untuk debugging
        
        // Power Automate terkadang membungkus array di dalam properti "value"
        if (data.value && Array.isArray(data.value)) {
          setBookedSchedules(data.value);
        } else if (Array.isArray(data)) {
          setBookedSchedules(data);
        } else {
          console.error("Format data dari Excel tidak dikenali:", data);
        }
      }
    } catch (error) {
      console.error('Gagal mengambil jadwal:', error);
    }
  };

  // Panggil fetchSchedules saat website pertama kali dibuka
  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Hanya ambil base64 content setelah koma, atau biarkan full data URI (opsional)
        // const base64Content = base64String.split(',')[1];
        setFormData(prev => ({
          ...prev,
          fileBase64: base64String.split(',')[1] || '',
          fileName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch(POST_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Cek apakah response dari server sukses
      if (!response.ok) {
        const errText = await response.text();
        console.error('Detail Error dari Power Automate:', errText);
        throw new Error('Gagal mengirim data ke server. Status: ' + response.status + ' - ' + errText);
      }

      setSubmitStatus('success');
      setFormData(initialFormData);
      
      // Ambil ulang jadwal agar langsung terupdate
      fetchSchedules();
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mengecek apakah kombinasi Lab, Tanggal, dan Sesi yang dipilih sudah ada di database Excel
  const isConflict = bookedSchedules.some(schedule => {
    // Karena di Excel Tanggal dan Sesi digabung di kolom "Tanggal & Jam" (contoh: "2026-06-11Sesi 1")
    const jadwalDigabung = `${formData.tanggal}${formData.sesi}`;
    
    return (
      schedule['Lab'] === formData.lab && 
      schedule['Tanggal & Jam'] === jadwalDigabung &&
      (schedule['Status Approval'] === 'Disetujui' || schedule['Status Approval'] === 'Pending' || !schedule['Status Approval'])
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 text-white p-2 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">LabConnect</h1>
              <p className="text-xs text-slate-500 font-medium">Sistem Peminjaman Laboratorium</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12 grid lg:grid-cols-12 gap-12">
        {/* Left Column: Info & Labs */}
        <div className="lg:col-span-5 space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
              Peminjaman LAB 4 Universitas Kristen Duta Wacana
            </h2>
            <p className="text-slate-600 text-lg">
              Ajukan peminjaman ruangan laboratorium dengan mudah. Seluruh pengajuan membutuhkan persetujuan Kepala Laboratorium.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {labs.map((lab) => (
              <div 
                key={lab.id} 
                className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg
                  ${formData.lab === lab.id ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-200' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                onClick={() => setFormData(prev => ({ ...prev, lab: lab.id }))}
              >
                {lab.icon}
                <h3 className="font-semibold text-slate-900">{lab.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{lab.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4 text-blue-900">
            <Info className="w-6 h-6 flex-shrink-0 text-blue-600" />
            <div>
              <h4 className="font-semibold mb-1">Alur Persetujuan (Approval)</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                Pengajuan Anda akan diproses melalui <b>Power Automate</b> dan diverifikasi oleh Kepala Lab. Notifikasi hasil persetujuan akan dikirimkan otomatis ke Email Penanggung Jawab.
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-purple-300 transition-colors">
            <div className="flex gap-4 items-center">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Cek Jadwal Ketersediaan</h4>
                <p className="text-sm text-slate-500">Pastikan ruangan kosong sebelum meminjam</p>
              </div>
            </div>
            <a 
              href="https://dwcu-my.sharepoint.com/:x:/g/personal/72230612_students_ukdw_ac_id/IQBT7PdCBMyQT7B_pNW8aOlQATLz49fKi-CCCA7QdyAXr7M?e=XMgLzT" 
              target="_blank" 
              rel="noreferrer"
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm whitespace-nowrap"
            >
              Lihat Excel
            </a>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h3 className="text-2xl font-bold text-slate-800">Formulir Peminjaman</h3>
              <p className="text-slate-500 mt-1">Lengkapi data berikut untuk mengajukan jadwal.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nama Peminjam</label>
                  <input 
                    type="text" name="nama" required
                    value={formData.nama} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Kategori Peminjam</label>
                  <select 
                    name="kategori" value={formData.kategori} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-white"
                  >
                    <option value="Organisasi">Organisasi / UKM</option>
                    <option value="Dosen">Dosen / Staf</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Penanggung Jawab</label>
                <input 
                  type="email" name="email" required
                  value={formData.email} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="email@universitas.ac.id"
                />
                <p className="text-xs text-slate-500">Notifikasi status (Approve/Reject) akan dikirim ke email ini.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Pilih Laboratorium</label>
                  <select 
                    name="lab" value={formData.lab} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-white"
                  >
                    <option value="MIS">MIS Lab</option>
                    <option value="Mobile">Mobile Lab</option>
                    <option value="AI">AI Lab</option>
                    <option value="Big Data">Big Data Lab</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tanggal</label>
                  <div className="relative">
                    <input 
                      type="date" name="tanggal" required
                      value={formData.tanggal} onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    />
                    <Calendar className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Sesi (Waktu)</label>
                  <select 
                    name="sesi" value={formData.sesi} onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition bg-white"
                  >
                    <option value="Sesi 1">Sesi 1 (07:30 - 10:00)</option>
                    <option value="Sesi 2">Sesi 2 (10:30 - 13:00)</option>
                    <option value="Sesi 3">Sesi 3 (13:30 - 16:00)</option>
                    <option value="Sesi 4">Sesi 4 (16:30 - 19:00)</option>
                  </select>
                </div>
              </div>

              {formData.tanggal && isConflict && (
                <div className="p-4 bg-red-50 text-red-800 rounded-xl flex gap-3 border border-red-200">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Jadwal Bentrok (Penuh)</p>
                    <p className="text-sm opacity-90">Maaf, <b>{formData.lab}</b> pada <b>{formData.tanggal}</b> di <b>{formData.sesi}</b> sudah dipinjam. Silakan pilih tanggal atau sesi yang lain.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Keperluan Peminjaman</label>
                <textarea 
                  name="keperluan" required rows={3}
                  value={formData.keperluan} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-none"
                  placeholder="Jelaskan secara singkat kegiatan yang akan dilakukan..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Surat Peminjaman (PDF/Gambar)</label>
                <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${formData.fileName ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'}`}>
                  <input type="file" required accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
                  
                  {formData.fileName ? (
                    <div className="flex flex-col items-center text-purple-700">
                      <CheckCircle2 className="w-8 h-8 mb-2 text-purple-600" />
                      <span className="font-medium">{formData.fileName}</span>
                      <span className="text-xs mt-1 opacity-75">Klik untuk mengganti file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Upload className="w-8 h-8 mb-2 text-slate-400" />
                      <span className="font-medium text-slate-700">Klik untuk unggah file</span>
                      <span className="text-xs mt-1">Maksimal 5MB (PDF/JPG/PNG)</span>
                    </div>
                  )}
                </label>
              </div>

              {submitStatus === 'success' && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl flex gap-3 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Pengajuan Berhasil Dikirim!</p>
                    <p className="text-sm opacity-90">Silakan cek email penanggung jawab untuk notifikasi selanjutnya. Kepala Lab akan segera mereview pengajuan ini.</p>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="p-4 bg-red-50 text-red-800 rounded-xl flex gap-3 border border-red-200">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Terjadi Kesalahan</p>
                    <p className="text-sm opacity-90">Gagal mengirim data. Pastikan Webhook URL Power Automate sudah benar atau coba lagi nanti.</p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || (formData.tanggal !== '' && isConflict)}
                className={`w-full font-semibold py-4 rounded-xl transition-all duration-300 shadow-lg ${
                  isConflict && formData.tanggal !== '' 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Mengirim Data...' : (isConflict && formData.tanggal !== '' ? 'Jadwal Penuh' : 'Kirim Pengajuan')}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
