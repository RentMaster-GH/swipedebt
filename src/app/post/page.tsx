// src/app/post/page.tsx - Global Country/Currency + Smart Form Validation + Evidence Upload
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, X, AlertTriangle, CheckCircle, FileImage, Phone } from "lucide-react";

const BILL_TYPES = ["School fees", "Rent", "ECG / Electricity", "Water Bill", "Medical Bill", "General Bill", "Emergency", "Other"];

interface CountryOption {
  code: string;
  name: string;
  currency: string;
  dial: string;
}

const COUNTRIES: CountryOption[] = [
{ code: "GH", name: "Ghana", currency: "GHS", dial: "233" },
{ code: "AF", name: "Afghanistan", currency: "AFN", dial: "93" },
{ code: "AL", name: "Albania", currency: "ALL", dial: "355" },
{ code: "DZ", name: "Algeria", currency: "DZD", dial: "213" },
{ code: "AO", name: "Angola", currency: "AOA", dial: "244" },
{ code: "AR", name: "Argentina", currency: "ARS", dial: "54" },
{ code: "AM", name: "Armenia", currency: "AMD", dial: "374" },
{ code: "AU", name: "Australia", currency: "AUD", dial: "61" },
{ code: "AT", name: "Austria", currency: "EUR", dial: "43" },
{ code: "AZ", name: "Azerbaijan", currency: "AZN", dial: "994" },
{ code: "BS", name: "Bahamas", currency: "BSD", dial: "1242" },
{ code: "BH", name: "Bahrain", currency: "BHD", dial: "973" },
{ code: "BD", name: "Bangladesh", currency: "BDT", dial: "880" },
{ code: "BB", name: "Barbados", currency: "BBD", dial: "1246" },
{ code: "BE", name: "Belgium", currency: "EUR", dial: "32" },
{ code: "BZ", name: "Belize", currency: "BZD", dial: "501" },
{ code: "BJ", name: "Benin", currency: "XOF", dial: "229" },
{ code: "BO", name: "Bolivia", currency: "BOB", dial: "591" },
{ code: "BA", name: "Bosnia and Herzegovina", currency: "BAM", dial: "387" },
{ code: "BW", name: "Botswana", currency: "BWP", dial: "267" },
{ code: "BR", name: "Brazil", currency: "BRL", dial: "55" },
{ code: "BN", name: "Brunei", currency: "BND", dial: "673" },
{ code: "BG", name: "Bulgaria", currency: "BGN", dial: "359" },
{ code: "BF", name: "Burkina Faso", currency: "XOF", dial: "226" },
{ code: "BI", name: "Burundi", currency: "BIF", dial: "257" },
{ code: "KH", name: "Cambodia", currency: "KHR", dial: "855" },
{ code: "CM", name: "Cameroon", currency: "XAF", dial: "237" },
{ code: "CA", name: "Canada", currency: "CAD", dial: "1" },
{ code: "CV", name: "Cape Verde", currency: "CVE", dial: "238" },
{ code: "CF", name: "Central African Republic", currency: "XAF", dial: "236" },
{ code: "TD", name: "Chad", currency: "XAF", dial: "235" },
{ code: "CL", name: "Chile", currency: "CLP", dial: "56" },
{ code: "CN", name: "China", currency: "CNY", dial: "86" },
{ code: "CO", name: "Colombia", currency: "COP", dial: "57" },
{ code: "KM", name: "Comoros", currency: "KMF", dial: "269" },
{ code: "CG", name: "Congo", currency: "XAF", dial: "242" },
{ code: "CD", name: "Congo (DRC)", currency: "CDF", dial: "243" },
{ code: "CR", name: "Costa Rica", currency: "CRC", dial: "506" },
{ code: "CI", name: "Côte d'Ivoire", currency: "XOF", dial: "225" },
{ code: "HR", name: "Croatia", currency: "EUR", dial: "385" },
{ code: "CU", name: "Cuba", currency: "CUP", dial: "53" },
{ code: "CY", name: "Cyprus", currency: "EUR", dial: "357" },
{ code: "CZ", name: "Czechia", currency: "CZK", dial: "420" },
{ code: "DK", name: "Denmark", currency: "DKK", dial: "45" },
{ code: "DJ", name: "Djibouti", currency: "DJF", dial: "253" },
{ code: "DO", name: "Dominican Republic", currency: "DOP", dial: "1809" },
{ code: "EC", name: "Ecuador", currency: "USD", dial: "593" },
{ code: "EG", name: "Egypt", currency: "EGP", dial: "20" },
{ code: "SV", name: "El Salvador", currency: "USD", dial: "503" },
{ code: "GQ", name: "Equatorial Guinea", currency: "XAF", dial: "240" },
{ code: "ER", name: "Eritrea", currency: "ERN", dial: "291" },
{ code: "EE", name: "Estonia", currency: "EUR", dial: "372" },
{ code: "SZ", name: "Eswatini", currency: "SZL", dial: "268" },
{ code: "ET", name: "Ethiopia", currency: "ETB", dial: "251" },
{ code: "FJ", name: "Fiji", currency: "FJD", dial: "679" },
{ code: "FI", name: "Finland", currency: "EUR", dial: "358" },
{ code: "FR", name: "France", currency: "EUR", dial: "33" },
{ code: "GA", name: "Gabon", currency: "XAF", dial: "241" },
{ code: "GM", name: "Gambia", currency: "GMD", dial: "220" },
{ code: "GE", name: "Georgia", currency: "GEL", dial: "995" },
{ code: "DE", name: "Germany", currency: "EUR", dial: "49" },
{ code: "GR", name: "Greece", currency: "EUR", dial: "30" },
{ code: "GT", name: "Guatemala", currency: "GTQ", dial: "502" },
{ code: "GN", name: "Guinea", currency: "GNF", dial: "224" },
{ code: "GW", name: "Guinea-Bissau", currency: "XOF", dial: "245" },
{ code: "GY", name: "Guyana", currency: "GYD", dial: "592" },
{ code: "HT", name: "Haiti", currency: "HTG", dial: "509" },
{ code: "HN", name: "Honduras", currency: "HNL", dial: "504" },
{ code: "HK", name: "Hong Kong", currency: "HKD", dial: "852" },
{ code: "HU", name: "Hungary", currency: "HUF", dial: "36" },
{ code: "IS", name: "Iceland", currency: "ISK", dial: "354" },
{ code: "IN", name: "India", currency: "INR", dial: "91" },
{ code: "ID", name: "Indonesia", currency: "IDR", dial: "62" },
{ code: "IQ", name: "Iraq", currency: "IQD", dial: "964" },
{ code: "IE", name: "Ireland", currency: "EUR", dial: "353" },
{ code: "IL", name: "Israel", currency: "ILS", dial: "972" },
{ code: "IT", name: "Italy", currency: "EUR", dial: "39" },
{ code: "JM", name: "Jamaica", currency: "JMD", dial: "1876" },
{ code: "JP", name: "Japan", currency: "JPY", dial: "81" },
{ code: "JO", name: "Jordan", currency: "JOD", dial: "962" },
{ code: "KZ", name: "Kazakhstan", currency: "KZT", dial: "7" },
{ code: "KE", name: "Kenya", currency: "KES", dial: "254" },
{ code: "KW", name: "Kuwait", currency: "KWD", dial: "965" },
{ code: "KG", name: "Kyrgyzstan", currency: "KGS", dial: "996" },
{ code: "LA", name: "Laos", currency: "LAK", dial: "856" },
{ code: "LV", name: "Latvia", currency: "EUR", dial: "371" },
{ code: "LB", name: "Lebanon", currency: "LBP", dial: "961" },
{ code: "LS", name: "Lesotho", currency: "LSL", dial: "266" },
{ code: "LR", name: "Liberia", currency: "LRD", dial: "231" },
{ code: "LY", name: "Libya", currency: "LYD", dial: "218" },
{ code: "LT", name: "Lithuania", currency: "EUR", dial: "370" },
{ code: "LU", name: "Luxembourg", currency: "EUR", dial: "352" },
{ code: "MG", name: "Madagascar", currency: "MGA", dial: "261" },
{ code: "MW", name: "Malawi", currency: "MWK", dial: "265" },
{ code: "MY", name: "Malaysia", currency: "MYR", dial: "60" },
{ code: "MV", name: "Maldives", currency: "MVR", dial: "960" },
{ code: "ML", name: "Mali", currency: "XOF", dial: "223" },
{ code: "MT", name: "Malta", currency: "EUR", dial: "356" },
{ code: "MR", name: "Mauritania", currency: "MRU", dial: "222" },
{ code: "MU", name: "Mauritius", currency: "MUR", dial: "230" },
{ code: "MX", name: "Mexico", currency: "MXN", dial: "52" },
{ code: "MD", name: "Moldova", currency: "MDL", dial: "373" },
{ code: "MN", name: "Mongolia", currency: "MNT", dial: "976" },
{ code: "ME", name: "Montenegro", currency: "EUR", dial: "382" },
{ code: "MA", name: "Morocco", currency: "MAD", dial: "212" },
{ code: "MZ", name: "Mozambique", currency: "MZN", dial: "258" },
{ code: "MM", name: "Myanmar", currency: "MMK", dial: "95" },
{ code: "NA", name: "Namibia", currency: "NAD", dial: "264" },
{ code: "NP", name: "Nepal", currency: "NPR", dial: "977" },
{ code: "NL", name: "Netherlands", currency: "EUR", dial: "31" },
{ code: "NZ", name: "New Zealand", currency: "NZD", dial: "64" },
{ code: "NI", name: "Nicaragua", currency: "NIO", dial: "505" },
{ code: "NE", name: "Niger", currency: "XOF", dial: "227" },
{ code: "NG", name: "Nigeria", currency: "NGN", dial: "234" },
{ code: "MK", name: "North Macedonia", currency: "MKD", dial: "389" },
{ code: "NO", name: "Norway", currency: "NOK", dial: "47" },
{ code: "OM", name: "Oman", currency: "OMR", dial: "968" },
{ code: "PK", name: "Pakistan", currency: "PKR", dial: "92" },
{ code: "PA", name: "Panama", currency: "PAB", dial: "507" },
{ code: "PG", name: "Papua New Guinea", currency: "PGK", dial: "675" },
{ code: "PY", name: "Paraguay", currency: "PYG", dial: "595" },
{ code: "PE", name: "Peru", currency: "PEN", dial: "51" },
{ code: "PH", name: "Philippines", currency: "PHP", dial: "63" },
{ code: "PL", name: "Poland", currency: "PLN", dial: "48" },
{ code: "PT", name: "Portugal", currency: "EUR", dial: "351" },
{ code: "QA", name: "Qatar", currency: "QAR", dial: "974" },
{ code: "RO", name: "Romania", currency: "RON", dial: "40" },
{ code: "RW", name: "Rwanda", currency: "RWF", dial: "250" },
{ code: "SA", name: "Saudi Arabia", currency: "SAR", dial: "966" },
{ code: "SN", name: "Senegal", currency: "XOF", dial: "221" },
{ code: "RS", name: "Serbia", currency: "RSD", dial: "381" },
{ code: "SL", name: "Sierra Leone", currency: "SLE", dial: "232" },
{ code: "SG", name: "Singapore", currency: "SGD", dial: "65" },
{ code: "SK", name: "Slovakia", currency: "EUR", dial: "421" },
{ code: "SI", name: "Slovenia", currency: "EUR", dial: "386" },
{ code: "SO", name: "Somalia", currency: "SOS", dial: "252" },
{ code: "ZA", name: "South Africa", currency: "ZAR", dial: "27" },
{ code: "KR", name: "South Korea", currency: "KRW", dial: "82" },
{ code: "SS", name: "South Sudan", currency: "SSP", dial: "211" },
{ code: "ES", name: "Spain", currency: "EUR", dial: "34" },
{ code: "LK", name: "Sri Lanka", currency: "LKR", dial: "94" },
{ code: "SD", name: "Sudan", currency: "SDG", dial: "249" },
{ code: "SR", name: "Suriname", currency: "SRD", dial: "597" },
{ code: "SE", name: "Sweden", currency: "SEK", dial: "46" },
{ code: "CH", name: "Switzerland", currency: "CHF", dial: "41" },
{ code: "TW", name: "Taiwan", currency: "TWD", dial: "886" },
{ code: "TJ", name: "Tajikistan", currency: "TJS", dial: "992" },
{ code: "TZ", name: "Tanzania", currency: "TZS", dial: "255" },
{ code: "TH", name: "Thailand", currency: "THB", dial: "66" },
{ code: "TG", name: "Togo", currency: "XOF", dial: "228" },
{ code: "TT", name: "Trinidad and Tobago", currency: "TTD", dial: "1868" },
{ code: "TN", name: "Tunisia", currency: "TND", dial: "216" },
{ code: "TR", name: "Turkey", currency: "TRY", dial: "90" },
{ code: "UG", name: "Uganda", currency: "UGX", dial: "256" },
{ code: "UA", name: "Ukraine", currency: "UAH", dial: "380" },
{ code: "AE", name: "United Arab Emirates", currency: "AED", dial: "971" },
{ code: "GB", name: "United Kingdom", currency: "GBP", dial: "44" },
{ code: "US", name: "United States", currency: "USD", dial: "1" },
{ code: "UY", name: "Uruguay", currency: "UYU", dial: "598" },
{ code: "UZ", name: "Uzbekistan", currency: "UZS", dial: "998" },
{ code: "VE", name: "Venezuela", currency: "VES", dial: "58" },
{ code: "VN", name: "Vietnam", currency: "VND", dial: "84" },
{ code: "YE", name: "Yemen", currency: "YER", dial: "967" },
{ code: "ZM", name: "Zambia", currency: "ZMW", dial: "260" },
{ code: "ZW", name: "Zimbabwe", currency: "ZWG", dial: "263" },
];
function normalizePhone(input: string, dialCode: string) {
if (!input) return "";
let p = input.trim().replace(/[\s()-]+/g, "").replace(/^+/, "");
if (!p) return "";
if (p.startsWith("0")) p = dialCode + p.slice(1);
else if (!p.startsWith(dialCode) && p.length <= 10) p = dialCode + p;
return p;
}
export default function PostBillPage() {
const router = useRouter();
const [loading, setLoading] = useState(false);
const [uploading, setUploading] = useState(false);
const [evidenceUrl, setEvidenceUrl] = useState("");
const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
const [preview, setPreview] = useState("");
const [error, setError] = useState("");
const [form, setForm] = useState({
countryCode: "GH",
bill_type: "School fees",
student_name: "",
bill_id: "",
amount: "",
school: "",
description: "",
owner_phone: "",
});
const selectedCountry = COUNTRIES.find((c) => c.code === form.countryCode) || COUNTRIES[0];
async function handleFile(e: React.ChangeEvent) {
const file = e.target.files?.[0];
if (!file) return;
setError("");
if (file.size > 5 * 1024 * 1024) { setError("File too large — max 5MB"); return; }
if (!["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"].includes(file.type)) {
setError("Only JPG, PNG, WEBP, or PDF");
return;
}
setEvidenceFile(file);
setPreview(file.type === "application/pdf" ? "pdf" : URL.createObjectURL(file));
setUploading(true);
try {
const fileName = Date.now() + "-" + file.name.replace(/\s/g, "_");
const { error: upErr } = await supabase.storage.from("evidence").upload(fileName, file);
if (upErr) throw upErr;
const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(fileName);
setEvidenceUrl(urlData.publicUrl);
} catch (err: any) {
setError("Upload failed: " + err.message);
setEvidenceFile(null);
setPreview("");
}
setUploading(false);
}
function removeEvidence() {
setEvidenceFile(null);
setEvidenceUrl("");
setPreview("");
}
const cleanPreviewPhone = normalizePhone(form.owner_phone, selectedCountry.dial);
const amountNum = Number(form.amount);
const missingReason = !form.student_name.trim()
? "Enter Name"
: !form.bill_id.trim()
? "Enter Bill ID"
: !amountNum || amountNum < 1
? "Enter Amount"
: !form.school.trim()
? "Enter Biller"
: cleanPreviewPhone.length < 8
? "Enter Phone"
: form.description.trim().length < 5
? "Enter Story"
: uploading
? "Uploading..."
: !evidenceUrl
? "Need Evidence"
: "";
const isFormValid = !missingReason;
async function handleSubmit() {
setError("");
if (missingReason) {
setError("Please complete: " + missingReason);
return;
}
setLoading(true);
try {
const billRef = selectedCountry.code + "-" + Date.now().toString().slice(-6);
const { error: insertErr } = await supabase.from("bills").insert({
bill_id: billRef,
student_name: form.student_name.trim(),
bill_type: form.bill_type,
bill_ref: form.bill_id.trim(),
amount: amountNum,
amount_paid: 0,
school: form.school.trim(),
description: form.description.trim(),
country: selectedCountry.code,
currency: selectedCountry.currency,
country_name: selectedCountry.name,
status: "pending",
evidence_url: evidenceUrl,
owner_phone: cleanPreviewPhone,
is_test: false,
});
if (insertErr) throw insertErr;
alert("Bill posted! Admin will verify. Owner phone +" + cleanPreviewPhone + " saved for contact.");
router.push("/");
} catch (err: any) {
setError(err.message);
}
setLoading(false);
}
return (

<button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400">
Back

Post Your Bill
<button onClick={() => router.push("/")} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">

Evidence + phone required. Admin verifies before showing on home.
Country / Currency
<select
value={form.countryCode}
onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
>
{COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} - {c.currency} ({c.code})
                </option>
              ))}

Bill Type
<select
value={form.bill_type}
onChange={(e) => setForm({ ...form, bill_type: e.target.value })}
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
>
{BILL_TYPES.map((t) => (
{t}
))}

Your Name *
<input
value={form.student_name}
onChange={(e) => setForm({ ...form, student_name: e.target.value })}
placeholder="Full name"
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>
Bill / Reference ID *
<input
value={form.bill_id}
onChange={(e) => setForm({ ...form, bill_id: e.target.value })}
placeholder="Meter no, rent ID, student ID"
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>
Amount in {selectedCountry.currency} *
<input
type="number"
value={form.amount}
onChange={(e) => setForm({ ...form, amount: e.target.value })}
placeholder={selectedCountry.currency + " e.g. 100"}
min={1}
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>
Biller / Landlord / School *
<input
value={form.school}
onChange={(e) => setForm({ ...form, school: e.target.value })}
placeholder="Utility provider, Landlord, School..."
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>
Your Phone ({selectedCountry.name}) * — donors/admin can contact you
<input
value={form.owner_phone}
onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
placeholder={"+" + selectedCountry.dial + "..."}
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>

{cleanPreviewPhone
? "Saved as +" + cleanPreviewPhone + " (hidden from public until approved)"
: "Enter phone number — hidden from public until approved"}

Your Story *
<textarea
rows={3}
value={form.description}
onChange={(e) => setForm({ ...form, description: e.target.value })}
placeholder="Explain why you need help clearing this bill..."
className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"
/>
Evidence * REQUIRED
{!evidenceFile ? (
) : (

{uploading ? "Uploading evidence..." : "Evidence uploaded"}

{evidenceFile.name}

)}
{error && (

{error}

)}
<button
type="button"
disabled={!isFormValid || loading}
onClick={handleSubmit}
className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-white/10 disabled:text-slate-500 text-slate-950 font-bold text-sm transition"
>
{loading ? "Posting Bill..." : isFormValid ? "Post Bill" : "Post Bill (" + missingReason + ")"}
<button
type="button"
onClick={() => router.push("/")}
className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
>
Cancel

<button
type="button"
onClick={() => router.back()}
className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
>
Go Back

);
}
