import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

async function main() {
  console.log("Seeding FixFlow demo data...");

  await prisma.jobEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.job.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Kool Care AC Services",
      whatsappNumber: "+91 98200 12345",
    },
  });

  await prisma.user.create({
    data: {
      businessId: business.id,
      name: "Kavita Desai",
      email: "owner@koolcare.in",
      password: await bcrypt.hash("fixflow123", 10),
      role: "owner",
    },
  });

  const [ramesh, suresh, vikram] = await Promise.all([
    prisma.technician.create({
      data: { businessId: business.id, name: "Ramesh Kumar", phone: "9876500001", skills: ["AC Repair", "AC Installation"] },
    }),
    prisma.technician.create({
      data: { businessId: business.id, name: "Suresh Yadav", phone: "9876500002", skills: ["AC Repair", "AC Service"] },
    }),
    prisma.technician.create({
      data: { businessId: business.id, name: "Vikram Singh", phone: "9876500003", skills: ["Appliance Repair"] },
    }),
  ]);

  const [rahul, priya, amit, sunita, deepak] = await Promise.all([
    prisma.customer.create({
      data: { businessId: business.id, name: "Rahul Sharma", phone: "9820011111", address: "B-204, Andheri West, Mumbai" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "Priya Shah", phone: "9820022222", address: "12 Jogeshwari East, Mumbai" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "Amit Mehta", phone: "9820033333", address: "45 Malad West, Mumbai" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "Sunita Rao", phone: "9820044444", address: "7 Goregaon East, Mumbai" },
    }),
    prisma.customer.create({
      data: { businessId: business.id, name: "Deepak Nair", phone: "9820055555", address: "22 Borivali West, Mumbai" },
    }),
  ]);

  // --- Job 1: Rahul, AC Installation, completed long ago, paid, warranty active ---
  const job1 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: rahul.id,
      technicianId: ramesh.id,
      serviceType: "AC Installation",
      problem: "New split AC installation, living room",
      address: rahul.address!,
      status: "completed",
      scheduledAt: daysAgo(200),
      startedAt: daysAgo(200),
      completedAt: daysAgo(200),
      findings: [],
      partsUsed: [{ name: "Copper piping", cost: 800 }, { name: "Mounting kit", cost: 400 }] as unknown as Prisma.InputJsonValue,
      laborCharge: 1300,
      totalAmount: 2500,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job1.id, type: "created", createdAt: daysAgo(201) },
      { jobId: job1.id, type: "assigned", note: "Assigned to Ramesh Kumar", createdAt: daysAgo(201) },
      { jobId: job1.id, type: "started", createdAt: daysAgo(200) },
      { jobId: job1.id, type: "completed", note: "Total amount: ₹2500", createdAt: daysAgo(200) },
      { jobId: job1.id, type: "payment_requested", createdAt: daysAgo(200) },
      { jobId: job1.id, type: "payment_received", note: "₹2500 via upi", createdAt: daysAgo(199) },
    ],
  });
  await prisma.payment.create({
    data: { businessId: business.id, jobId: job1.id, amount: 2500, status: "paid", method: "upi", requestedAt: daysAgo(200), paidAt: daysAgo(199) },
  });
  await prisma.warranty.create({ data: { jobId: job1.id, expiresAt: daysFromNow(165) } });

  // --- Job 2: Rahul, AC Service, completed recently, paid, warranty active ---
  const job2 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: rahul.id,
      technicianId: ramesh.id,
      serviceType: "AC Service",
      problem: "Routine cleaning and gas check",
      address: rahul.address!,
      status: "completed",
      scheduledAt: daysAgo(40),
      startedAt: daysAgo(40),
      completedAt: daysAgo(40),
      findings: ["Cleaning"],
      partsUsed: [] as unknown as Prisma.InputJsonValue,
      laborCharge: 800,
      totalAmount: 800,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job2.id, type: "created", createdAt: daysAgo(41) },
      { jobId: job2.id, type: "completed", note: "Total amount: ₹800", createdAt: daysAgo(40) },
      { jobId: job2.id, type: "payment_received", note: "₹800 via cash", createdAt: daysAgo(40) },
    ],
  });
  await prisma.payment.create({
    data: { businessId: business.id, jobId: job2.id, amount: 800, status: "paid", method: "cash", requestedAt: daysAgo(40), paidAt: daysAgo(40) },
  });
  await prisma.warranty.create({ data: { jobId: job2.id, expiresAt: daysFromNow(20) } });

  // --- Job 3: Priya, AC Repair, completed, payment still pending ---
  const job3 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: priya.id,
      technicianId: suresh.id,
      serviceType: "AC Repair",
      problem: "AC not cooling properly",
      address: priya.address!,
      status: "completed",
      scheduledAt: daysAgo(5),
      startedAt: daysAgo(5),
      completedAt: daysAgo(5),
      findings: ["Gas issue"],
      partsUsed: [{ name: "Refrigerant gas (R32)", cost: 1200 }] as unknown as Prisma.InputJsonValue,
      laborCharge: 650,
      totalAmount: 1850,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job3.id, type: "created", createdAt: daysAgo(5) },
      { jobId: job3.id, type: "completed", note: "Total amount: ₹1850", createdAt: daysAgo(5) },
      { jobId: job3.id, type: "payment_requested", createdAt: daysAgo(5) },
    ],
  });
  await prisma.payment.create({
    data: { businessId: business.id, jobId: job3.id, amount: 1850, status: "pending", requestedAt: daysAgo(5) },
  });
  await prisma.warranty.create({ data: { jobId: job3.id, expiresAt: daysFromNow(85) } });

  const priyaConversation = await prisma.conversation.create({
    data: { businessId: business.id, customerId: priya.id, status: "resolved", lastMessageAt: daysAgo(5) },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: priyaConversation.id,
        direction: "inbound",
        text: "AC not cooling properly since morning, please send technician",
        aiIntent: "repair",
        aiExtracted: {
          intent: "repair",
          serviceType: "AC Repair",
          problem: "AC not cooling / possible gas issue",
          urgency: "normal",
          preferredTime: null,
          estimatedMin: 1200,
          estimatedMax: 2800,
          suggestedReply: "Sure Priya, we can arrange a technician. Would 3-5 PM or 5-7 PM work better today?",
        } as unknown as Prisma.InputJsonValue,
        createdAt: daysAgo(5),
      },
      {
        conversationId: priyaConversation.id,
        direction: "outbound",
        text: "Sure Priya, we can arrange a technician. Would 3-5 PM or 5-7 PM work better today?",
        createdAt: daysAgo(5),
      },
      {
        conversationId: priyaConversation.id,
        direction: "outbound",
        text: "Your service has been completed. Amount payable: ₹1850. You're covered under a 90-day warranty.",
        createdAt: daysAgo(5),
      },
    ],
  });

  // --- Job 4: Amit, AC Repair, completed, paid, warranty expiring in 2 days ---
  const job4 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: amit.id,
      technicianId: vikram.id,
      serviceType: "AC Repair",
      problem: "Unusual noise from appliance",
      address: amit.address!,
      status: "completed",
      scheduledAt: daysAgo(88),
      startedAt: daysAgo(88),
      completedAt: daysAgo(88),
      findings: ["Compressor"],
      partsUsed: [] as unknown as Prisma.InputJsonValue,
      laborCharge: 1200,
      totalAmount: 1200,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job4.id, type: "created", createdAt: daysAgo(89) },
      { jobId: job4.id, type: "completed", note: "Total amount: ₹1200", createdAt: daysAgo(88) },
      { jobId: job4.id, type: "payment_received", note: "₹1200 via upi", createdAt: daysAgo(88) },
    ],
  });
  await prisma.payment.create({
    data: { businessId: business.id, jobId: job4.id, amount: 1200, status: "paid", method: "upi", requestedAt: daysAgo(88), paidAt: daysAgo(88) },
  });
  await prisma.warranty.create({ data: { jobId: job4.id, expiresAt: daysFromNow(2) } });

  // --- Job 5: Sunita, AC Repair, scheduled but delayed (technician hasn't started) ---
  const job5 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: sunita.id,
      technicianId: ramesh.id,
      serviceType: "AC Repair",
      problem: "AC not cooling / possible gas issue",
      address: sunita.address!,
      status: "scheduled",
      scheduledAt: minutesAgo(60),
      estimatedMin: 1200,
      estimatedMax: 2800,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job5.id, type: "created", createdAt: minutesAgo(90) },
      { jobId: job5.id, type: "assigned", note: "Assigned to Ramesh Kumar", createdAt: minutesAgo(85) },
    ],
  });

  const sunitaConversation = await prisma.conversation.create({
    data: { businessId: business.id, customerId: sunita.id, status: "open", lastMessageAt: minutesAgo(85) },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: sunitaConversation.id,
        direction: "inbound",
        text: "AC not cooling properly since morning, please send technician",
        aiIntent: "repair",
        aiExtracted: {
          intent: "repair",
          serviceType: "AC Repair",
          problem: "AC not cooling / possible gas issue",
          urgency: "normal",
          preferredTime: null,
          estimatedMin: 1200,
          estimatedMax: 2800,
          suggestedReply: "Sure Sunita, we can arrange a technician. Would 3-5 PM or 5-7 PM work better today?",
        } as unknown as Prisma.InputJsonValue,
        createdAt: minutesAgo(90),
      },
      {
        conversationId: sunitaConversation.id,
        direction: "outbound",
        text: "Your service has been scheduled. Our technician Ramesh Kumar will visit you then.",
        createdAt: minutesAgo(85),
      },
    ],
  });

  // --- Job 6: Deepak, AC Service, in progress right now ---
  const job6 = await prisma.job.create({
    data: {
      businessId: business.id,
      customerId: deepak.id,
      technicianId: suresh.id,
      serviceType: "AC Service",
      problem: "AC service karwani hai",
      address: deepak.address!,
      status: "in_progress",
      scheduledAt: minutesAgo(30),
      startedAt: minutesAgo(20),
      estimatedMin: 600,
      estimatedMax: 1200,
    },
  });
  await prisma.jobEvent.createMany({
    data: [
      { jobId: job6.id, type: "created", createdAt: minutesAgo(120) },
      { jobId: job6.id, type: "assigned", note: "Assigned to Suresh Yadav", createdAt: minutesAgo(100) },
      { jobId: job6.id, type: "started", createdAt: minutesAgo(20) },
    ],
  });

  const deepakConversation = await prisma.conversation.create({
    data: { businessId: business.id, customerId: deepak.id, status: "open", lastMessageAt: minutesAgo(100) },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: deepakConversation.id,
        direction: "inbound",
        text: "AC service karwani hai, kal 4 baje aa sakte ho?",
        aiIntent: "service",
        aiExtracted: {
          intent: "repair",
          serviceType: "AC Service",
          problem: "Routine AC service/cleaning requested",
          urgency: "normal",
          preferredTime: "4",
          estimatedMin: 600,
          estimatedMax: 1200,
          suggestedReply: "Sure Deepak, we can arrange a technician for \"Routine AC service/cleaning requested\". Would 3-5 PM or 5-7 PM work better today?",
        } as unknown as Prisma.InputJsonValue,
        createdAt: minutesAgo(120),
      },
      {
        conversationId: deepakConversation.id,
        direction: "outbound",
        text: "Your service has been scheduled. Our technician Suresh Yadav will visit you then.",
        createdAt: minutesAgo(100),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Login: owner@koolcare.in / fixflow123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
