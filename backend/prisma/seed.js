/**
 * Demo data. All hospitals and doctors are fictional.
 * Run: npm run db:seed   (or npm run db:reset to wipe + migrate + seed)
 */
import prismaPkg from "@prisma/client";
const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient();

const ist = (dayOffset, hh, mm = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  // Convert IST wall-clock to UTC
  return new Date(d.getTime() + (hh * 60 + mm - 330) * 60_000);
};

const dateStr = (dayOffset) => ist(dayOffset, 12).toISOString().slice(0, 10);

const hospitals = [
  {
    slug: "sabarmati-care-hospital",
    name: "Sabarmati Care Hospital",
    tagline: "Heart and bone care, 24×7",
    description:
      "A 220-bed multispeciality hospital on SG Highway with a dedicated cardiac cath lab, joint replacement unit and round-the-clock emergency.",
    address: "Near Thaltej Cross Roads, SG Highway",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380054",
    phone: "+91 79 4000 1100",
    lat: 23.0504,
    lng: 72.517,
    specialties: ["Cardiology", "Orthopaedics", "General Medicine", "Emergency"],
    rating: 4.7,
    reviewCount: 2140,
    beds: 220,
    tone: "#1747E5",
    imageUrl: "/images/doctor-team.jpg",
    doctors: [
      {
        name: "Dr. Kavita Shah",
        autoConfirm: false,
        specialty: "Cardiology",
        qualification: "MD, DM (Cardiology)",
        experienceYears: 18,
        registrationNo: "DEMO-REG-1001",
        fee: 900,
        languages: ["English", "Hindi", "Gujarati"],
      },
      {
        name: "Dr. Rohan Mehta",
        specialty: "Orthopaedics",
        qualification: "MS (Ortho)",
        experienceYears: 12,
        registrationNo: "DEMO-REG-1002",
        fee: 700,
        languages: ["English", "Gujarati"],
      },
      {
        name: "Dr. Farah Qureshi",
        specialty: "General Medicine",
        qualification: "MD (Medicine)",
        experienceYears: 9,
        registrationNo: "DEMO-REG-1003",
        fee: 500,
        languages: ["English", "Hindi", "Urdu"],
        startTime: "16:00",
        endTime: "20:00",
      },
    ],
    events: [
      {
        title: "Free heart check-up camp",
        description:
          "ECG, BP and blood sugar screening with a cardiologist consult. Walk in with your old reports.",
        type: "HEALTH_CAMP",
        day: 3,
        from: 9,
        to: 14,
        venue: "OPD Block, Ground floor",
        seats: 200,
      },
      {
        title: "Knee pain: when do you need surgery?",
        description: "A 45-minute talk by Dr. Rohan Mehta, followed by open Q&A for patients and families.",
        type: "TALK",
        day: 9,
        from: 17,
        to: 18,
        venue: "Auditorium, 3rd floor",
      },
    ],
  },
  {
    slug: "narmada-mother-child",
    name: "Narmada Mother & Child Centre",
    tagline: "Maternity, NICU and paediatrics",
    description:
      "Level III NICU, painless delivery and a paediatric ward designed for families who stay overnight.",
    address: "Prahladnagar Garden Road",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    phone: "+91 79 4000 2200",
    lat: 23.012,
    lng: 72.5108,
    specialties: ["Gynaecology", "Paediatrics", "Neonatology"],
    rating: 4.8,
    reviewCount: 1675,
    beds: 120,
    tone: "#0E7C86",
    doctors: [
      {
        name: "Dr. Meera Iyer",
        specialty: "Gynaecology",
        qualification: "MS (OBG)",
        experienceYears: 15,
        registrationNo: "DEMO-REG-1004",
        fee: 800,
        languages: ["English", "Hindi", "Tamil"],
      },
      {
        name: "Dr. Aarav Desai",
        specialty: "Paediatrics",
        qualification: "MD (Paeds)",
        experienceYears: 8,
        registrationNo: "DEMO-REG-1005",
        fee: 600,
        languages: ["English", "Gujarati", "Hindi"],
      },
    ],
    events: [
      {
        title: "Polio and MR vaccination drive",
        description: "Free vaccination for children under 5. Bring the child's vaccination card.",
        type: "DRIVE",
        day: 1,
        from: 9,
        to: 16,
        venue: "Paediatric wing",
        seats: 300,
      },
      {
        title: "First 1000 days: new parents workshop",
        description: "Breastfeeding, sleep and nutrition basics with our lactation consultant.",
        type: "WORKSHOP",
        day: 6,
        from: 11,
        to: 13,
        venue: "Seminar room B",
        isFree: false,
        seats: 40,
      },
    ],
  },
  {
    slug: "gomti-multispeciality",
    name: "Gomti Multispeciality",
    tagline: "Neuro, kidney and dialysis",
    description: "A 300-bed tertiary hospital with a 24-chair dialysis unit and stroke-ready emergency.",
    address: "Ellisbridge, Ashram Road",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380006",
    phone: "+91 79 4000 3300",
    lat: 23.0225,
    lng: 72.5714,
    specialties: ["Neurology", "Nephrology", "Urology", "Emergency"],
    rating: 4.5,
    reviewCount: 980,
    beds: 300,
    tone: "#5B3FD6",
    doctors: [
      {
        name: "Dr. Vikram Joshi",
        specialty: "Neurology",
        qualification: "DM (Neurology)",
        experienceYears: 20,
        registrationNo: "DEMO-REG-1006",
        fee: 1000,
        languages: ["English", "Hindi", "Gujarati"],
      },
      {
        name: "Dr. Sneha Patil",
        specialty: "Nephrology",
        qualification: "DM (Nephrology)",
        experienceYears: 11,
        registrationNo: "DEMO-REG-1007",
        fee: 900,
        languages: ["English", "Marathi", "Hindi"],
      },
    ],
    events: [
      {
        title: "World Kidney Day screening",
        description: "Free creatinine and urine test for adults with diabetes or high BP.",
        type: "SCREENING",
        day: 12,
        from: 8,
        to: 12,
        venue: "Dialysis block lobby",
      },
    ],
  },
  {
    slug: "arabian-sea-hospital",
    name: "Arabian Sea Hospital",
    tagline: "Cancer care and robotic surgery",
    description: "Comprehensive cancer centre with day-care chemotherapy and a robotic surgery suite.",
    address: "Bandra Reclamation",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    phone: "+91 22 4000 4400",
    lat: 19.0544,
    lng: 72.8402,
    specialties: ["Oncology", "General Surgery", "Cardiology"],
    rating: 4.6,
    reviewCount: 3120,
    beds: 410,
    tone: "#0B5CAD",
    imageUrl: "/images/bharosa.jpg",
    doctors: [
      {
        name: "Dr. Anjali Rao",
        specialty: "Oncology",
        qualification: "MD, DM (Medical Oncology)",
        experienceYears: 16,
        registrationNo: "DEMO-REG-1008",
        fee: 1500,
        languages: ["English", "Hindi", "Marathi"],
      },
      {
        name: "Dr. Imran Sheikh",
        specialty: "General Surgery",
        qualification: "MS, FRCS",
        experienceYears: 14,
        registrationNo: "DEMO-REG-1009",
        fee: 1200,
        languages: ["English", "Hindi"],
      },
    ],
    events: [
      {
        title: "Breast cancer awareness walk",
        description: "A 3 km walk along Bandstand with free screening coupons for participants.",
        type: "DRIVE",
        day: 5,
        from: 7,
        to: 9,
        venue: "Bandstand Promenade",
      },
    ],
  },
  {
    slug: "western-ghats-clinic",
    name: "Western Ghats Hospital",
    tagline: "Family medicine and diabetes",
    description: "Neighbourhood hospital known for its diabetes clinic and same-day lab reports.",
    address: "Kothrud, Paud Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411038",
    phone: "+91 20 4000 5500",
    lat: 18.5074,
    lng: 73.8077,
    specialties: ["Endocrinology", "General Medicine", "Dermatology"],
    rating: 4.4,
    reviewCount: 640,
    beds: 80,
    tone: "#2563EB",
    doctors: [
      {
        name: "Dr. Nikhil Kulkarni",
        specialty: "Endocrinology",
        qualification: "DM (Endocrinology)",
        experienceYears: 10,
        registrationNo: "DEMO-REG-1010",
        fee: 800,
        languages: ["English", "Marathi", "Hindi"],
      },
      {
        name: "Dr. Pooja Bhat",
        specialty: "Dermatology",
        qualification: "MD (Dermatology)",
        experienceYears: 7,
        registrationNo: "DEMO-REG-1011",
        fee: 600,
        languages: ["English", "Kannada", "Hindi"],
      },
    ],
    events: [
      {
        title: "Diabetes foot-care camp",
        description: "Free foot screening and footwear advice for people with diabetes.",
        type: "HEALTH_CAMP",
        day: 4,
        from: 10,
        to: 13,
        venue: "Ground floor OPD",
      },
    ],
  },
  {
    slug: "cubbon-heart-institute",
    name: "Cubbon Heart Institute",
    tagline: "Dedicated cardiac hospital",
    description: "A cardiac-only hospital with a 24×7 cath lab and a 30-bed cardiac ICU.",
    address: "Richmond Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560025",
    phone: "+91 80 4000 6600",
    lat: 12.9649,
    lng: 77.6007,
    specialties: ["Cardiology", "Cardiac Surgery"],
    rating: 4.8,
    reviewCount: 2890,
    beds: 180,
    tone: "#1E40AF",
    imageUrl: "/images/trust.jpg",
    doctors: [
      {
        name: "Dr. Suresh Gowda",
        specialty: "Cardiology",
        qualification: "DM (Cardiology)",
        experienceYears: 22,
        registrationNo: "DEMO-REG-1012",
        fee: 1200,
        languages: ["English", "Kannada", "Hindi"],
      },
      {
        name: "Dr. Lakshmi Narayan",
        specialty: "Cardiac Surgery",
        qualification: "MCh (CTVS)",
        experienceYears: 17,
        registrationNo: "DEMO-REG-1013",
        fee: 1500,
        languages: ["English", "Kannada", "Tamil"],
      },
    ],
    events: [
      {
        title: "Hands-only CPR training",
        description: "Learn CPR in 60 minutes. Certificates for all participants.",
        type: "WORKSHOP",
        day: 2,
        from: 10,
        to: 11,
        venue: "Skills lab, 2nd floor",
        seats: 60,
      },
    ],
  },
  {
    slug: "yamuna-city-hospital",
    name: "Yamuna City Hospital",
    tagline: "Trauma, ortho and physiotherapy",
    description: "Level I trauma centre with a 40-station physiotherapy and sports injury rehab floor.",
    address: "Lajpat Nagar IV",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110024",
    phone: "+91 11 4000 7700",
    lat: 28.5677,
    lng: 77.2433,
    specialties: ["Orthopaedics", "Physiotherapy", "Emergency", "General Medicine"],
    rating: 4.5,
    reviewCount: 1530,
    beds: 260,
    tone: "#3B5BDB",
    imageUrl: "/images/care-family.jpg",
    doctors: [
      {
        name: "Dr. Harpreet Singh",
        specialty: "Orthopaedics",
        qualification: "MS (Ortho), Fellowship Sports Medicine",
        experienceYears: 13,
        registrationNo: "DEMO-REG-1014",
        fee: 1000,
        languages: ["English", "Hindi", "Punjabi"],
      },
      {
        name: "Dr. Ritu Malhotra",
        specialty: "Physiotherapy",
        qualification: "MPT (Sports)",
        experienceYears: 9,
        registrationNo: "DEMO-REG-1015",
        fee: 500,
        languages: ["English", "Hindi"],
      },
    ],
    events: [
      {
        title: "Senior citizens bone-density camp",
        description: "Free BMD scan for adults over 60, with a physiotherapy consult.",
        type: "SCREENING",
        day: 7,
        from: 9,
        to: 13,
        venue: "Rehab floor",
        seats: 120,
      },
    ],
  },
  {
    slug: "deccan-eye-ent",
    name: "Deccan Eye & ENT",
    tagline: "Cataract, LASIK and ENT",
    description: "Day-care eye and ENT hospital with no-stitch cataract surgery and hearing clinic.",
    address: "Banjara Hills Road No. 12",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    phone: "+91 40 4000 8800",
    lat: 17.4126,
    lng: 78.4392,
    specialties: ["Ophthalmology", "ENT"],
    rating: 4.6,
    reviewCount: 1210,
    beds: 50,
    tone: "#0369A1",
    doctors: [
      {
        name: "Dr. Sameer Reddy",
        specialty: "Ophthalmology",
        qualification: "MS (Ophthalmology)",
        experienceYears: 14,
        registrationNo: "DEMO-REG-1016",
        fee: 700,
        languages: ["English", "Telugu", "Hindi"],
      },
      {
        name: "Dr. Ayesha Fatima",
        specialty: "ENT",
        qualification: "MS (ENT)",
        experienceYears: 10,
        registrationNo: "DEMO-REG-1017",
        fee: 650,
        languages: ["English", "Urdu", "Telugu"],
      },
    ],
    events: [
      {
        title: "Free cataract screening",
        description:
          "Vision test and cataract check for adults over 50. Surgery at subsidised rates if needed.",
        type: "HEALTH_CAMP",
        day: 8,
        from: 9,
        to: 15,
        venue: "Main OPD",
      },
    ],
  },
];

async function main() {
  console.log("Clearing old data…");
  await prisma.otpChallenge.deleteMany();
  await prisma.outboundMessage.deleteMany();
  await prisma.hospitalApplication.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.event.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hospital.deleteMany();
  const created = {};
  for (const h of hospitals) {
    const { doctors, events, ...data } = h;
    const hosp = await prisma.hospital.create({
      data: {
        ...data,
        doctors: { create: doctors },
        events: {
          create: events.map((e) => ({
            title: e.title,
            description: e.description,
            type: e.type,
            venue: e.venue,
            isFree: e.isFree ?? true,
            seats: e.seats,
            startsAt: ist(e.day, e.from),
            endsAt: ist(e.day, e.to),
          })),
        },
      },
      include: { doctors: true },
    });
    created[h.slug] = { id: hosp.id, doctorIds: hosp.doctors.map((d) => d.id) };
  }
  // Paid placements (admin-managed)
  await prisma.promotion.createMany({
    data: [
      {
        hospitalId: created["sabarmati-care-hospital"].id,
        title: "Heart month",
        highlight: "Free ECG with every cardiology visit this month",
        priority: 5,
        startsAt: ist(-3, 0),
        endsAt: ist(27, 0),
      },
      {
        hospitalId: created["cubbon-heart-institute"].id,
        title: "CPR week",
        highlight: "Book a consult, get a free CPR class seat",
        priority: 3,
        startsAt: ist(-1, 0),
        endsAt: ist(14, 0),
      },
      {
        hospitalId: created["narmada-mother-child"].id,
        title: "New parents",
        highlight: "Free first paediatric visit for newborns",
        priority: 2,
        startsAt: ist(-10, 0),
        endsAt: ist(20, 0),
      },
    ],
  });
  const sab = created["sabarmati-care-hospital"];
  await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@vitalyn.in",
      phone: "9800000004",
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      name: "Front Desk, Sabarmati",
      email: "hospital@vitalyn.in",
      phone: "9800000002",
      role: "HOSPITAL",
      hospitalId: sab.id,
    },
  });
  const docUser = await prisma.user.create({
    data: {
      name: "Dr. Kavita Shah",
      email: "doctor@vitalyn.in",
      phone: "9800000003",
      role: "DOCTOR",
      hospitalId: sab.id,
    },
  });
  await prisma.doctor.update({ where: { id: sab.doctorIds[0] }, data: { userId: docUser.id } });
  const patient = await prisma.user.create({
    data: {
      name: "Riya Patel",
      email: "user@vitalyn.in",
      phone: "9800000001",
      consentAt: new Date(),
      consentVersion: "2026-11-v1",
      profiles: {
        create: [
          { name: "Riya Patel", age: 29, gender: "FEMALE", relation: "Self" },
          { name: "Mahesh Patel", age: 61, gender: "MALE", relation: "Father" },
        ],
      },
    },
    include: { profiles: true },
  });
  const [self, father] = patient.profiles.sort((a, b) => (a.relation === "Self" ? -1 : b.relation === "Self" ? 1 : 0));
  await prisma.hospital.update({
    where: { id: sab.id },
    data: { registrationNo: "GJ/AMC/CEA/2019/0412", hfrId: "IN2410000187" },
  });
  // A few bookings in different states so every dashboard has something to show
  const [kavita, rohan, farah] = sab.doctorIds;
  const bookings = [
    {
      doctorId: kavita,
      date: dateStr(1),
      time: "09:30",
      status: "PENDING",
      patientName: "Riya Patel",
      reason: "Chest tightness while climbing stairs",
    },
    {
      doctorId: kavita,
      date: dateStr(1),
      time: "10:00",
      status: "PENDING",
      patientName: "Mahesh Patel",
      patientAge: 61,
      profileId: "father",
      reason: "Follow-up after angioplasty",
    },
    {
      doctorId: rohan,
      date: dateStr(2),
      time: "11:15",
      status: "CONFIRMED",
      tokenNumber: 1,
      patientName: "Riya Patel",
      reason: "Knee pain after running",
    },
    {
      doctorId: farah,
      date: dateStr(3),
      time: "17:00",
      status: "CONFIRMED",
      tokenNumber: 1,
      patientName: "Riya Patel",
      reason: "Fever for 3 days",
    },
    {
      doctorId: kavita,
      date: dateStr(-6),
      time: "09:00",
      status: "COMPLETED",
      tokenNumber: 4,
      patientName: "Riya Patel",
      reason: "Routine BP check",
    },
  ];
  const ACTIVE = ["PENDING", "CONFIRMED"];
  for (const b of bookings) {
    const isFather = b.profileId === "father";
    const a = await prisma.appointment.create({
      data: {
        ...b,
        profileId: isFather ? father.id : self.id,
        patientAge: isFather ? 61 : 29,
        userId: patient.id,
        hospitalId: sab.id,
        // Demo requests stay open until 2 hours before their slot
        approveBy: ACTIVE.includes(b.status) ? new Date(new Date(`${b.date}T${b.time}:00+05:30`).getTime() - 2 * 3600_000) : null,
        paidAt: b.status === "COMPLETED" ? new Date(`${b.date}T${b.time}:00+05:30`) : null,
      },
      include: { doctor: true },
    });
    await prisma.appointmentEvent.create({ data: { appointmentId: a.id, action: "book", to: b.status === "PENDING" ? "PENDING" : "CONFIRMED", actorId: patient.id } });
    if (b.status === "CONFIRMED") {
      await prisma.notification.create({
        data: {
          userId: patient.id,
          appointmentId: a.id,
          title: `Confirmed: token ${a.doctor.name.replace(/^Dr\.?\s*/, "")[0]}-${String(a.tokenNumber).padStart(2, "0")}`,
          body: `${a.date} at ${a.time} with ${a.doctor.name}. Show your token at the desk.`,
        },
      });
    }
  }
  console.log(`Seeded ${hospitals.length} hospitals, ${bookings.length} bookings, 4 demo accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
