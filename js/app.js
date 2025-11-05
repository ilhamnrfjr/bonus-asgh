// js/app.js - VERSI LENGKAP DENGAN ERROR HANDLING

// Konfigurasi API
const API_BASE_URL = window.location.origin + '/api';

// Data karyawan - akan diambil dari database
let employees = [];

// Opsi untuk dropdown rank
const rankOptions = [
    "Hospital Executive", 
    "Executive Assistant", 
    "Medical Director", 
    "Attending Physician", 
    "Fellow", 
    "Senior Resident", 
    "Resident"
];

const absenceOptions = ["Full Absence", "No Absence"];

// Variabel untuk menyimpan data Excel
let excelData = null;

// Variabel untuk mode edit karyawan
let editingEmployeeId = null;

// Variabel untuk sync
let lastEmployeesUpdate = null;
let lastBonusUpdate = null;
let isOnline = true;
let syncInterval;

// Fungsi untuk mengambil data dari API
async function fetchData(url, options = {}) {
    try {
        console.log('Fetching:', url);
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response:', data);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        showErrorNotification('Terjadi kesalahan saat mengambil data dari server');
        return null;
    }
}

// Fungsi untuk mengirim data ke API
async function sendData(url, method, data) {
    try {
        console.log('Sending data:', method, url, data);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Send response:', result);
        return result;
    } catch (error) {
        console.error('Error sending data:', error);
        showErrorNotification('Terjadi kesalahan saat mengirim data ke server');
        return null;
    }
}

// Fungsi untuk menampilkan notifikasi error
function showErrorNotification(message) {
    const notification = document.getElementById('save-notification');
    notification.textContent = message;
    notification.style.backgroundColor = '#f44336';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.style.backgroundColor = '#4caf50';
    }, 5000);
}

// Fungsi untuk menampilkan notifikasi sukses
function showSaveNotification(message = 'Data berhasil disimpan!') {
    const notification = document.getElementById('save-notification');
    notification.textContent = message;
    notification.style.backgroundColor = '#4caf50';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Fungsi untuk memuat data karyawan dari database
async function loadEmployees() {
    console.log('Loading employees...');
    const data = await fetchData(`${API_BASE_URL}/employees.php`);
    
    if (data && data.success) {
        employees = data.employees;
        lastEmployeesUpdate = data.last_updated;
        renderSpreadsheet();
        renderEmployeeList();
        console.log('Data karyawan berhasil dimuat:', employees.length, 'employees');
        updateSyncStatus();
    } else {
        console.error('Gagal memuat data karyawan:', data);
    }
}

// Fungsi untuk memuat data bonus minggu tertentu
async function loadBonusData(week) {
    const data = await fetchData(`${API_BASE_URL}/bonus.php/${week}`);
    
    if (data && data.success) {
        lastBonusUpdate = data.last_updated;
        
        // Update data karyawan dengan data bonus
        employees.forEach(emp => {
            const bonusRecord = data.bonusData.find(b => b.employee_id === emp.id);
            if (bonusRecord) {
                emp.inputZone = bonusRecord.input_zone || "";
                emp.absence = bonusRecord.absence_status || "No Absence";
                emp.absenceLink = bonusRecord.absence_link || "";
                calculateRow(employees.indexOf(emp));
            }
        });
        
        renderSpreadsheet();
        console.log('Data bonus berhasil dimuat dari database');
        updateSyncStatus();
    }
}

// Fungsi untuk check data updates
async function checkForUpdates() {
    try {
        // Untuk simplicity, kita load ulang data employees dan bonus
        await loadEmployees();
        
        const currentWeek = document.getElementById('week-input').value || 1;
        await loadBonusData(currentWeek);
        
    } catch (error) {
        console.log('Sync check failed, might be offline');
        isOnline = false;
        updateSyncStatus();
    }
}

// Fungsi untuk update sync status indicator
function updateSyncStatus() {
    const now = new Date().toLocaleTimeString();
    const statusElement = document.getElementById('sync-status') || createSyncStatusElement();
    
    if (isOnline) {
        statusElement.innerHTML = `🟢 Online - Terakhir update: ${now}`;
        statusElement.className = 'sync-status online';
    } else {
        statusElement.innerHTML = `🔴 Offline - Data lokal`;
        statusElement.className = 'sync-status offline';
    }
}

// Fungsi untuk membuat sync status element
function createSyncStatusElement() {
    const statusElement = document.createElement('div');
    statusElement.id = 'sync-status';
    statusElement.className = 'sync-status online';
    
    // Tambahkan ke footer
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.appendChild(statusElement);
    }
    
    return statusElement;
}

// Fungsi untuk merender spreadsheet
function renderSpreadsheet() {
    const tbody = document.getElementById('spreadsheet-body');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    employees.forEach((emp, index) => {
        const row = document.createElement('tr');
        
        // Kolom Move Buttons
        const moveCell = document.createElement('td');
        const moveButtons = document.createElement('div');
        moveButtons.classList.add('move-buttons');
        
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '▲';
        upBtn.className = 'move-btn';
        upBtn.disabled = index === 0;
        upBtn.onclick = () => moveRowUp(index);
        
        const downBtn = document.createElement('button');
        downBtn.innerHTML = '▼';
        downBtn.className = 'move-btn';
        downBtn.disabled = index === employees.length - 1;
        downBtn.onclick = () => moveRowDown(index);
        
        moveButtons.appendChild(upBtn);
        moveButtons.appendChild(downBtn);
        moveCell.appendChild(moveButtons);
        row.appendChild(moveCell);
        
        // Kolom Name
        const nameCell = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = emp.name || '';
        nameInput.dataset.index = index;
        nameInput.addEventListener('input', (e) => {
            employees[e.target.dataset.index].name = e.target.value;
            saveData();
        });
        nameCell.appendChild(nameInput);
        row.appendChild(nameCell);
        
        // Kolom Rank
        const rankCell = document.createElement('td');
        const rankSelect = document.createElement('select');
        rankSelect.dataset.index = index;
        
        rankOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            rankSelect.appendChild(opt);
        });
        
        rankSelect.value = emp.rank || 'Resident';
        rankSelect.addEventListener('change', (e) => {
            employees[e.target.dataset.index].rank = e.target.value;
            calculateRow(e.target.dataset.index);
            saveData();
        });
        
        rankCell.appendChild(rankSelect);
        row.appendChild(rankCell);
        
        // Kolom Absence Status
        const absenceCell = document.createElement('td');
        const absenceSelect = document.createElement('select');
        absenceSelect.dataset.index = index;
        
        absenceOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            absenceSelect.appendChild(opt);
        });
        
        absenceSelect.value = emp.absence || 'No Absence';
        absenceSelect.addEventListener('change', (e) => {
            const rowIndex = e.target.dataset.index;
            employees[rowIndex].absence = e.target.value;
            calculateRow(rowIndex);
            saveData();
            
            // Show/hide absence link input based on selection
            const absenceLinkInput = row.cells[4].querySelector('input');
            if (e.target.value === "Full Absence") {
                absenceLinkInput.style.display = 'block';
                absenceLinkInput.placeholder = 'https://fire.san-andreas.net/viewtopic.php?t=XXXXX';
            } else {
                absenceLinkInput.style.display = 'none';
                absenceLinkInput.value = '';
                employees[rowIndex].absenceLink = '';
            }
        });
        
        absenceCell.appendChild(absenceSelect);
        row.appendChild(absenceCell);

        // Kolom Absence Link
        const absenceLinkCell = document.createElement('td');
        const absenceLinkInput = document.createElement('input');
        absenceLinkInput.type = 'text';
        absenceLinkInput.value = emp.absenceLink || '';
        absenceLinkInput.placeholder = 'https://fire.san-andreas.net/viewtopic.php?t=XXXXX';
        absenceLinkInput.dataset.index = index;
        absenceLinkInput.style.display = (emp.absence === "Full Absence") ? 'block' : 'none';
        absenceLinkInput.addEventListener('input', (e) => {
            employees[e.target.dataset.index].absenceLink = e.target.value;
            saveData();
        });
        absenceLinkCell.appendChild(absenceLinkInput);
        row.appendChild(absenceLinkCell);
        
        // Kolom Input Zone
        const inputCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.value = emp.inputZone || '';
        input.min = 0;
        input.step = 100;
        input.dataset.index = index;
        input.addEventListener('input', (e) => {
            employees[e.target.dataset.index].inputZone = e.target.value;
            calculateRow(e.target.dataset.index);
            saveData();
        });
        inputCell.appendChild(input);
        row.appendChild(inputCell);
        
        // Kolom Bonus
        const bonusCell = document.createElement('td');
        bonusCell.textContent = formatCurrency(emp.bonus);
        bonusCell.classList.add('bonus-value');
        row.appendChild(bonusCell);
        
        // Kolom Penalty
        const penaltyCell = document.createElement('td');
        penaltyCell.textContent = formatCurrency(emp.penalty);
        penaltyCell.classList.add('penalty-value');
        row.appendChild(penaltyCell);
        
        // Kolom Conclusion
        const conclusionCell = document.createElement('td');
        conclusionCell.textContent = emp.conclusion || 'No Penalty';
        conclusionCell.dataset.index = index;
        
        if (emp.conclusion === "Penalty") {
            conclusionCell.classList.add('conclusion-penalty');
        } else {
            conclusionCell.classList.add('conclusion-no-penalty');
        }
        
        row.appendChild(conclusionCell);
        
        tbody.appendChild(row);
    });
    
    // Hitung grand total setelah render
    calculateGrandTotal();
}

// Fungsi untuk memformat nilai mata uang dengan simbol $
function formatCurrency(value) {
    if (value === "" || value === null || value === undefined) return "$0";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "$0";
    return `$${numValue.toLocaleString()}`;
}

// Fungsi untuk menghitung bonus dan penalty per baris
function calculateRow(index) {
    const employee = employees[index];
    let bonus = parseFloat(employee.inputZone) || 0;
    
    // Aturan penghitungan bonus
    if (employee.rank === "Hospital Executive" || employee.rank === "Executive Assistant") {
        // Hospital Executive dan Executive Assistant tidak dikurangi 1500
        employee.bonus = bonus;
    } else if (employee.absence === "Full Absence") {
        // Full Absence tidak dikurangi 1500
        employee.bonus = bonus;
    } else if (employee.absence === "No Absence") {
        // No Absence dikurangi 1500 untuk semua rank lainnya
        employee.bonus = bonus - 1500;
    } else {
        // Default (jika ada status lain) tidak dikurangi
        employee.bonus = bonus;
    }
    
    // Hitung penalty
    if (employee.bonus < 0) {
        employee.penalty = Math.abs(employee.bonus);
        employee.bonus = 0;
        employee.conclusion = "Penalty";
    } else {
        employee.penalty = 0;
        employee.conclusion = "No Penalty";
    }
    
    // Perbarui tampilan baris
    updateRowDisplay(index);
    
    // Hitung ulang grand total
    calculateGrandTotal();
}

// Fungsi untuk menghitung grand total
function calculateGrandTotal() {
    let totalBonus = 0;
    let totalPenalty = 0;
    
    employees.forEach(emp => {
        totalBonus += parseFloat(emp.bonus) || 0;
        totalPenalty += parseFloat(emp.penalty) || 0;
    });
    
    const grandTotalBonus = document.getElementById('grand-total-bonus');
    const grandTotalPenalty = document.getElementById('grand-total-penalty');
    
    if (grandTotalBonus) grandTotalBonus.textContent = formatCurrency(totalBonus);
    if (grandTotalPenalty) grandTotalPenalty.textContent = formatCurrency(totalPenalty);
}

// Fungsi untuk memperbarui tampilan baris
function updateRowDisplay(index) {
    const employee = employees[index];
    const rows = document.getElementById('spreadsheet-body').rows;
    
    if (rows[index]) {
        // Update bonus
        rows[index].cells[6].textContent = formatCurrency(employee.bonus);
        
        // Update penalty
        rows[index].cells[7].textContent = formatCurrency(employee.penalty);
        
        // Update conclusion
        rows[index].cells[8].textContent = employee.conclusion;
        
        // Tambahkan class untuk styling conclusion
        if (employee.conclusion === "Penalty") {
            rows[index].cells[8].className = 'conclusion-penalty';
        } else {
            rows[index].cells[8].className = 'conclusion-no-penalty';
        }
    }
}

// Fungsi untuk memindahkan baris ke atas
function moveRowUp(index) {
    if (index > 0) {
        // Tukar posisi dengan baris di atasnya
        [employees[index], employees[index - 1]] = [employees[index - 1], employees[index]];
        
        // Re-render spreadsheet
        renderSpreadsheet();
        
        // Recalculate semua baris yang terpengaruh
        calculateRow(index - 1);
        calculateRow(index);
        
        // Highlight baris yang dipindah
        setTimeout(() => {
            highlightUpdatedRow(index - 1);
        }, 100);
        
        saveData();
    }
}

// Fungsi untuk memindahkan baris ke bawah
function moveRowDown(index) {
    if (index < employees.length - 1) {
        // Tukar posisi dengan baris di bawahnya
        [employees[index], employees[index + 1]] = [employees[index + 1], employees[index]];
        
        // Re-render spreadsheet
        renderSpreadsheet();
        
        // Recalculate semua baris yang terpengaruh
        calculateRow(index);
        calculateRow(index + 1);
        
        // Highlight baris yang dipindah
        setTimeout(() => {
            highlightUpdatedRow(index + 1);
        }, 100);
        
        saveData();
    }
}

// Fungsi untuk highlight baris yang diupdate
function highlightUpdatedRow(index) {
    const rows = document.getElementById('spreadsheet-body').rows;
    if (rows[index]) {
        rows[index].classList.add('data-updated');
        setTimeout(() => {
            rows[index].classList.remove('data-updated');
        }, 2000);
    }
}

// Fungsi untuk menambah baris
function addRow() {
    employees.push({
        name: "New Employee",
        rank: "Resident",
        absence: "No Absence",
        absenceLink: "",
        inputZone: "",
        bonus: "",
        penalty: "0",
        conclusion: "No Penalty"
    });
    
    renderSpreadsheet();
    saveData();
}

// Fungsi untuk menghapus baris
function removeRow() {
    if (employees.length > 1) {
        employees.pop();
        renderSpreadsheet();
        saveData();
    } else {
        alert("Tidak dapat menghapus baris terakhir.");
    }
}

// Fungsi untuk reset ke data default
function resetToDefault() {
    if (confirm("Apakah Anda yakin ingin mereset semua data ke kondisi awal? Data bonus yang tersimpan akan dihapus.")) {
        // Reset input week
        document.getElementById('week-input').value = 1;
        document.getElementById('file-name').textContent = "Tidak ada file dipilih";
        const excelFileInput = document.getElementById('excel-file');
        if (excelFileInput) excelFileInput.value = "";
        excelData = null;
        
        // Muat ulang data karyawan (akan load default data dari database)
        loadEmployees();
        
        // Sembunyikan panel BBCode
        const bbcodeSection = document.getElementById('bbcode-section');
        if (bbcodeSection) bbcodeSection.style.display = 'none';
        
        alert("Data telah direset ke kondisi awal.");
    }
}

// Fungsi untuk menangani upload file Excel
function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('file-name').textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Ambil sheet pertama
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Konversi ke JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Simpan data untuk digunakan nanti
        excelData = jsonData;
        
        // Tampilkan preview data (opsional)
        console.log("Data Excel yang diupload:", jsonData);
    };
    reader.readAsArrayBuffer(file);
}

// Fungsi untuk import data dari Excel
function importExcelData() {
    if (!excelData || excelData.length < 2) {
        alert("Silakan upload file Excel terlebih dahulu.");
        return;
    }
    
    // Header seharusnya: Personnel, Rank, Bills Income
    const headers = excelData[0].map(h => h ? h.toString().toLowerCase() : '');
    const personnelIndex = headers.findIndex(h => h.includes('personnel'));
    const billsIndex = headers.findIndex(h => h.includes('bills'));
    
    if (personnelIndex === -1 || billsIndex === -1) {
        alert("Format Excel tidak sesuai. Pastikan ada kolom 'Personnel' dan 'Bills Income'.");
        return;
    }
    
    let matchedCount = 0;
    let updatedRows = [];
    
    // Buat map dari data Excel untuk pencarian yang lebih efisien
    const excelDataMap = new Map();
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        if (row.length > Math.max(personnelIndex, billsIndex)) {
            const name = row[personnelIndex] ? row[personnelIndex].toString().trim() : '';
            const billsIncome = parseFloat(row[billsIndex]) || 0;
            
            if (name) {
                excelDataMap.set(name.toLowerCase(), billsIncome);
            }
        }
    }
    
    // Update hanya karyawan yang sudah ada di daftar tetap
    employees.forEach((employee, index) => {
        const employeeNameLower = employee.name.toLowerCase();
        
        // Cari nama yang cocok di data Excel
        if (excelDataMap.has(employeeNameLower)) {
            const billsIncome = excelDataMap.get(employeeNameLower);
            employee.inputZone = billsIncome;
            calculateRow(index);
            updatedRows.push(index);
            matchedCount++;
        }
    });
    
    // Render ulang spreadsheet
    renderSpreadsheet();
    
    // Highlight baris yang diupdate
    updatedRows.forEach(index => {
        setTimeout(() => highlightUpdatedRow(index), 100);
    });

    // Save data setelah import
    saveData();
    
    if (matchedCount > 0) {
        alert(`Data berhasil diimpor!\n\n` +
              `- Total nama yang cocok dan diupdate: ${matchedCount}\n` +
              `- Total data di Excel: ${excelData.length - 1}\n` +
              `- Data yang diupdate akan dihighlight dengan warna hijau`);
    } else {
        alert("Tidak ada nama yang cocok antara data Excel dan daftar karyawan yang terdaftar.\n\n" +
              "Pastikan nama di Excel sama persis dengan nama di sistem.");
    }
    
    // Log untuk debugging
    console.log(`Matched ${matchedCount} employees from Excel data`);
}

// Fungsi untuk menyimpan data ke database
async function saveData() {
    const week = document.getElementById('week-input').value || 1;
    
    // Siapkan data bonus untuk disimpan
    const bonusData = employees.map(emp => ({
        employee_id: emp.id,
        input_zone: emp.inputZone || 0,
        absence_status: emp.absence || "No Absence",
        absence_link: emp.absenceLink || "",
        bonus: emp.bonus || 0,
        penalty: emp.penalty || 0,
        conclusion: emp.conclusion || "No Penalty"
    }));
    
    try {
        const result = await sendData(`${API_BASE_URL}/bonus.php`, 'POST', {
            week: parseInt(week),
            bonusData: bonusData
        });
        
        if (result && result.success) {
            showSaveNotification();
            console.log('Data bonus berhasil disimpan ke database');
        } else {
            throw new Error('Gagal menyimpan data');
        }
    } catch (error) {
        console.error('Gagal menyimpan data bonus:', error);
        showErrorNotification('Gagal menyimpan data. Periksa koneksi internet.');
    }
}

// Fungsi untuk generate BBCode
function generateBBCode() {
    const week = document.getElementById('week-input').value || 1;
    let totalBonus = 0;
    
    // Hitung total bonus
    employees.forEach(emp => {
        totalBonus += parseFloat(emp.bonus) || 0;
    });

    let bbcode = `[divbox=#007ac4]
[divbox=white]
[space][/space]
[center][img]https://i.imgur.com/ft40MBy.png[/img][img]https://i.imgur.com/pW2978r.png[/img][/center]
[space][/space]
[divbox=#007ac4][center][color=transparent][SPACER][/color][/center]
[aligntable=left,0,100,0,0,0,transparent][/aligntable]

[aligntable=#300000;font-family:century gothic;right,0,180,100,0,0,transparent][center][color=#FFFFFF][size=200][b]San Andreas[/b][/size][b] [size=200]Fire Department[/size][/b]
[b][size=200] Hospital Bonus Details[/size][/b][/color][/center][/aligntable]
[center][color=transparent][SPACER][/color][/center][/divbox]
[space][/space]

[center][color=#007ac4][size=200][b][i]WEEK ${week}[/i][/b][/size][/color][/center]

[space][/space]
[divbox=white][aligntable=right,0,0,0,0,0,transparent][center][/aligntable][/center][CENTER][size=200][b][color=#007ac4][font=times new roman]All Saint's General Hospital[/font][/color][/b][/size][/CENTER][/divbox]


[table]
[tr]
[td1=#007ac4][center][b][color=white]Name[/color][/b][/center][/td1]
[td1=#007ac4][center][b][color=white]Rank[/color][/b][/center][/td1]
[td1=#007ac4][center][b][color=white]Absence Status[/color][/b][/center][/td1]
[td1=#007ac4][center][b][color=white]Bonus[/color][/b][/center][/td1]
[/tr]

`;

    // Generate rows untuk setiap employee yang memiliki input zone atau bonus
    employees.forEach(emp => {
        const bonus = parseFloat(emp.bonus) || 0;
        const inputZone = parseFloat(emp.inputZone) || 0;
        
        // Skip employee yang tidak ada input zone sama sekali (field kosong)
        if (emp.inputZone === "" || emp.inputZone === null || emp.inputZone === undefined || inputZone === 0) {
            return;
        }
        
        console.log(`Processing ${emp.name}: InputZone=${emp.inputZone}, Bonus=${bonus}`);

        // Tentukan apakah menggunakan [cb] atau [cbf]
        const cbTag = bonus === 0 ? 'cbf' : 'cb';
        
        // Format absence status
        let absenceStatus = 'N/A';
        if (emp.absence === 'Full Absence') {
            if (emp.absenceLink && emp.absenceLink.trim()) {
                absenceStatus = `[url=${emp.absenceLink.trim()}]Full Absence[/url]`;
            } else {
                absenceStatus = 'Full Absence';
            }
        }

        // Format bonus dengan $ dan format angka
        const formattedBonus = `$${bonus.toLocaleString()}`;

        bbcode += `[tr]
[td1=white][color=black][${cbTag}]${emp.name}[/color]
[td1=white][center]${emp.rank}[/center][/td1]
[td1=white][center]${absenceStatus}[/center][/td1]
[td1=white][center]${formattedBonus}[/center][/td1]
[/tr]

`;
    });

    // Add grand total row
    bbcode += `[tr]
[td1=#007ac4][center][color=white][b]Grand Total[/b][/color][/center]
[td1=#007ac4][center][/center][/td1]
[td1=#007ac4][center][/center][/td1]
[td1=white][center]$${totalBonus.toLocaleString()}[/center][/td1]

[/tr]
[/table]

[space][/space][/divbox]`;

    // Tampilkan hasil BBCode
    const bbcodeOutput = document.getElementById('bbcode-output');
    const bbcodeSection = document.getElementById('bbcode-section');
    
    if (bbcodeOutput && bbcodeSection) {
        bbcodeOutput.value = bbcode;
        bbcodeSection.style.display = 'block';
        
        // Scroll ke section BBCode
        bbcodeSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Fungsi untuk copy BBCode ke clipboard
function copyBBCode() {
    const bbcodeOutput = document.getElementById('bbcode-output');
    if (!bbcodeOutput) return;
    
    bbcodeOutput.select();
    bbcodeOutput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        
        // Show notification
        const copyButton = document.querySelector('.copy-button');
        if (copyButton) {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            copyButton.style.backgroundColor = '#4caf50';
            
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.style.backgroundColor = '#4caf50';
            }, 2000);
        }
        
    } catch (err) {
        alert('Failed to copy BBCode. Please select and copy manually.');
    }
}

// Fungsi untuk toggle admin panel
function toggleAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel) return;
    
    if (adminPanel.style.display === 'block') {
        adminPanel.style.display = 'none';
    } else {
        adminPanel.style.display = 'block';
        loadEmployees();
    }
}

// Fungsi untuk menampilkan form karyawan
function showEmployeeForm(employee = null) {
    const form = document.getElementById('employee-form');
    const title = document.getElementById('form-title');
    const nameInput = document.getElementById('employee-name');
    const rankSelect = document.getElementById('employee-rank');
    const saveBtn = document.getElementById('save-employee-btn');
    
    if (!form || !title || !nameInput || !rankSelect || !saveBtn) return;
    
    if (employee) {
        // Mode edit
        title.textContent = 'Edit Karyawan';
        nameInput.value = employee.name || '';
        rankSelect.value = employee.rank || 'Resident';
        editingEmployeeId = employee.id;
        saveBtn.textContent = 'Update';
    } else {
        // Mode tambah
        title.textContent = 'Tambah Karyawan Baru';
        nameInput.value = '';
        rankSelect.value = 'Resident';
        editingEmployeeId = null;
        saveBtn.textContent = 'Simpan';
    }
    
    form.style.display = 'block';
}

// Fungsi untuk menyembunyikan form karyawan
function hideEmployeeForm() {
    const form = document.getElementById('employee-form');
    if (form) {
        form.style.display = 'none';
    }
    editingEmployeeId = null;
}

// Fungsi untuk menyimpan karyawan (tambah atau edit)
async function saveEmployee() {
    const nameInput = document.getElementById('employee-name');
    const rankSelect = document.getElementById('employee-rank');
    
    if (!nameInput || !rankSelect) return;
    
    const name = nameInput.value.trim();
    const rank = rankSelect.value;
    
    console.log('Saving employee:', { name, rank, editingEmployeeId });
    
    if (!name) {
        alert('Nama karyawan tidak boleh kosong');
        return;
    }
    
    let result;
    
    if (editingEmployeeId) {
        // Update karyawan yang sudah ada
        result = await sendData(`${API_BASE_URL}/employees.php/${editingEmployeeId}`, 'PUT', {
            name: name,
            rank: rank
        });
    } else {
        // Tambah karyawan baru
        result = await sendData(`${API_BASE_URL}/employees.php`, 'POST', {
            name: name,
            rank: rank
        });
    }
    
    if (result && result.success) {
        hideEmployeeForm();
        await loadEmployees(); // Muat ulang data
        alert(editingEmployeeId ? 'Karyawan berhasil diupdate' : 'Karyawan berhasil ditambahkan');
    } else {
        alert('Gagal menyimpan data karyawan: ' + (result?.error || 'Unknown error'));
    }
}

// Fungsi untuk menghapus karyawan
async function deleteEmployee(id) {
    if (confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) {
        console.log('Deleting employee:', id);
        const result = await fetchData(`${API_BASE_URL}/employees.php/${id}`, {
            method: 'DELETE'
        });
        
        if (result && result.success) {
            await loadEmployees(); // Muat ulang data
            alert('Karyawan berhasil dihapus');
        } else {
            alert('Gagal menghapus karyawan: ' + (result?.error || 'Unknown error'));
        }
    }
}

// Fungsi untuk merender daftar karyawan di admin panel
function renderEmployeeList() {
    const employeeList = document.getElementById('employee-list');
    if (!employeeList) return;
    
    employeeList.innerHTML = '';
    
    if (employees.length === 0) {
        employeeList.innerHTML = '<p>Tidak ada data karyawan.</p>';
        return;
    }
    
    employees.forEach(emp => {
        const item = document.createElement('div');
        item.className = 'employee-item';
        
        item.innerHTML = `
            <div>
                <strong>${emp.name || 'Unknown'}</strong> - ${emp.rank || 'Resident'}
            </div>
            <div class="employee-actions">
                <button class="edit-btn" onclick="showEmployeeForm(${JSON.stringify(emp).replace(/"/g, '&quot;')})">Edit</button>
                <button class="delete-btn" onclick="deleteEmployee(${emp.id})">Hapus</button>
            </div>
        `;
        
        employeeList.appendChild(item);
    });
}

// Fungsi debug untuk test koneksi
async function testConnection() {
    console.log('Testing connection...');
    const result = await fetchData(`${API_BASE_URL}/debug.php`);
    console.log('Debug result:', result);
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing application...');
    
    // Test koneksi pertama
    await testConnection();
    
    // Muat data karyawan dari database
    await loadEmployees();
    
    // Set event listener untuk input week
    const weekInput = document.getElementById('week-input');
    if (weekInput) {
        weekInput.addEventListener('input', (e) => {
            // Muat data bonus untuk week yang dipilih
            const week = e.target.value || 1;
            loadBonusData(week);
        });
    }
    
    // Set event listener untuk file input
    const excelFileInput = document.getElementById('excel-file');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelUpload);
    }

    // Auto save setiap 30 detik
    setInterval(saveData, 30000);
    
    // Sync check setiap 10 detik
    syncInterval = setInterval(checkForUpdates, 10000);
    
    // Check online status
    window.addEventListener('online', () => {
        isOnline = true;
        updateSyncStatus();
        console.log('Koneksi online, melakukan sync...');
        checkForUpdates();
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncStatus();
        console.log('Koneksi offline');
    });
    
    console.log('Application initialized');
});

// Cleanup interval ketika page unload
window.addEventListener('beforeunload', () => {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
});

// js/app.js - TAMBAHKAN DI BAGIAN INI

// Variabel untuk auto-refresh
let autoRefreshInterval;
let isAutoRefreshEnabled = true;

// Fungsi untuk auto-refresh data
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh setiap 30 detik
    autoRefreshInterval = setInterval(async () => {
        if (isAutoRefreshEnabled && isOnline) {
            console.log('Auto-refreshing data...');
            await checkForUpdates();
        }
    }, 30000); // 30 detik
}

// Fungsi untuk check updates dengan timestamp
async function checkForUpdates() {
    try {
        // Check employees updates
        const employeesData = await fetchData(`${API_BASE_URL}/employees.php`);
        if (employeesData && employeesData.success) {
            if (employeesData.last_updated !== lastEmployeesUpdate) {
                console.log('Employees data changed, refreshing...');
                await loadEmployees();
                showUpdateNotification('Data karyawan diperbarui');
            }
        }

        // Check bonus updates untuk week yang aktif
        const currentWeek = document.getElementById('week-input').value || 1;
        const bonusData = await fetchData(`${API_BASE_URL}/bonus.php/${currentWeek}`);
        if (bonusData && bonusData.success) {
            if (bonusData.last_updated !== lastBonusUpdate) {
                console.log('Bonus data changed, refreshing...');
                await loadBonusData(currentWeek);
                showUpdateNotification('Data bonus diperbarui');
            }
        }
        
    } catch (error) {
        console.log('Update check failed:', error);
        isOnline = false;
        updateSyncStatus();
    }
}

// Fungsi untuk menampilkan notifikasi update
function showUpdateNotification(message) {
    // Buat notification element jika belum ada
    let notification = document.getElementById('update-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.className = 'update-notification';
        document.body.appendChild(notification);
    }
    
    notification.innerHTML = `
        <div class="update-content">
            <span>🔄 ${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notification.classList.add('show');
    
    // Auto hide setelah 5 detik
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Tambahkan juga di CSS untuk styling notifikasi
// Fungsi untuk toggle auto-refresh
function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    
    const toggleButton = document.getElementById('auto-refresh-toggle');
    if (toggleButton) {
        if (isAutoRefreshEnabled) {
            toggleButton.textContent = 'Auto Refresh: ON';
            toggleButton.className = 'auto-refresh-toggle enabled';
            startAutoRefresh();
            showUpdateNotification('Auto-refresh diaktifkan');
        } else {
            toggleButton.textContent = 'Auto Refresh: OFF';
            toggleButton.className = 'auto-refresh-toggle disabled';
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
            showUpdateNotification('Auto-refresh dimatikan');
        }
    }
    
    updateSyncStatus();
}

// Fungsi untuk membuat auto-refresh controls
function createAutoRefreshControls() {
    const controls = document.createElement('div');
    controls.className = 'auto-refresh-controls';
    
    controls.innerHTML = `
        <span>Auto-refresh:</span>
        <button id="auto-refresh-toggle" class="auto-refresh-toggle enabled" onclick="toggleAutoRefresh()">
            Auto Refresh: ON
        </button>
        <button onclick="manualRefresh()" style="padding: 4px 8px; font-size: 11px;">
            Refresh Sekarang
        </button>
    `;
    
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
        syncStatus.parentNode.insertBefore(controls, syncStatus);
    }
    
    return controls;
}

// Fungsi untuk manual refresh
async function manualRefresh() {
    showUpdateNotification('Memuat ulang data...');
    await checkForUpdates();
    showUpdateNotification('Data diperbarui');
}

// Update fungsi updateSyncStatus
function updateSyncStatus() {
    const now = new Date().toLocaleTimeString();
    const statusElement = document.getElementById('sync-status') || createSyncStatusElement();
    
    let statusText = '';
    if (isOnline) {
        if (isAutoRefreshEnabled) {
            statusText = `🟢 Online - Auto Refresh ON - Terakhir: ${now}`;
        } else {
            statusText = `🟡 Online - Auto Refresh OFF - Terakhir: ${now}`;
        }
    } else {
        statusText = `🔴 Offline - Data lokal`;
    }
    
    statusElement.innerHTML = statusText;
    statusElement.className = `sync-status ${isOnline ? 'online' : 'offline'} ${isAutoRefreshEnabled ? 'auto-refresh' : ''}`;
}
// Inisialisasi
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing application...');
    
    // Test koneksi pertama
    await testConnection();
    
    // Buat auto-refresh controls
    createAutoRefreshControls();
    
    // Muat data karyawan dari database
    await loadEmployees();
    
    // Set event listener untuk input week
    const weekInput = document.getElementById('week-input');
    if (weekInput) {
        weekInput.addEventListener('input', (e) => {
            const week = e.target.value || 1;
            loadBonusData(week);
        });
    }
    
    // Set event listener untuk file input
    const excelFileInput = document.getElementById('excel-file');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelUpload);
    }

    // Auto save setiap 30 detik
    setInterval(saveData, 30000);
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Check online status
    window.addEventListener('online', () => {
        isOnline = true;
        updateSyncStatus();
        console.log('Koneksi online, melakukan sync...');
        checkForUpdates();
        if (isAutoRefreshEnabled) {
            startAutoRefresh();
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncStatus();
        console.log('Koneksi offline');
    });
    
    console.log('Application initialized with auto-refresh');
});