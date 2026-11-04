import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { writeFile, mkdir } from "node:fs/promises";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "51224")
  throw new Error(
    "QA fixtures require the isolated local database on port 51224.",
  );
const prisma = new PrismaClient();
async function main() {
  try {
    const password = await hashPassword("geoolymp-qa-2026");
    const teacher = await prisma.user.upsert({
      where: { email: "teacher@example.test" },
      update: {},
      create: {
        name: "Учитель Географии",
        email: "teacher@example.test",
        password,
        role: "TEACHER",
        emailVerified: true,
      },
    });
    const student = await prisma.user.upsert({
      where: { email: "student@example.test" },
      update: {},
      create: {
        name: "Ученик Географии",
        email: "student@example.test",
        password,
        role: "STUDENT",
        emailVerified: true,
      },
    });
    let group = await prisma.group.findUnique({
      where: { inviteCode: "QA-GEO" },
    });
    if (!group) {
      group = await prisma.group.create({
        data: {
          name: "География Казахстана",
          description:
            "Рельеф, климат и водные ресурсы. Учебная группа для проверки удобства сайта.",
          inviteCode: "QA-GEO",
          teacherId: teacher.id,
          memberships: { create: { userId: student.id } },
        },
      });
      const tasks = await Promise.all([
        prisma.task.create({
          data: {
            groupId: group.id,
            title: "Рельеф Казахстана",
            description:
              "Почему на юго-востоке Казахстана расположены высокие горы?",
            maxScore: 10,
            type: "TEXT",
            explanationText:
              "Сопоставьте строение земной коры и положение горных систем.",
          },
        }),
        prisma.task.create({
          data: {
            groupId: group.id,
            title: "Озеро Балхаш",
            description: "Какая особенность характерна для озера Балхаш?",
            maxScore: 5,
            type: "SINGLE_CHOICE",
            options:
              "Разная солёность воды\nПолностью солёное озеро\nЗамерзает только восточная часть",
            correctAnswer: "Разная солёность воды",
            explanationText:
              "Западная часть озера почти пресная благодаря притоку реки Или, восточная — солоноватая.",
          },
        }),
        prisma.task.create({
          data: {
            groupId: group.id,
            title: "Соседи Казахстана",
            description: "Выберите государства с общей сухопутной границей.",
            maxScore: 8,
            type: "MULTIPLE_CHOICE",
            options: "Россия\nКитай\nМонголия",
            correctAnswer: "Китай; Россия",
          },
        }),
      ]);
      await prisma.taskSet.create({
        data: {
          groupId: group.id,
          title: "Физическая география · практика",
          description:
            "Решайте в своём темпе, смотрите разборы и исправляйте ответы.",
          items: {
            create: tasks.map((task, index) => ({
              taskId: task.id,
              position: index + 1,
            })),
          },
        },
      });
      const timed = await prisma.task.create({
        data: {
          groupId: group.id,
          title: "Климат Казахстана",
          description: "Какой тип климата преобладает в Казахстане?",
          maxScore: 5,
          type: "SINGLE_CHOICE",
          options: "Резко континентальный\nМуссонный\nМорской",
          correctAnswer: "Резко континентальный",
        },
      });
      const timedText = await prisma.task.create({
        data: {
          groupId: group.id,
          title: "Факторы климата",
          description: "Объясните влияние удалённости от океанов.",
          maxScore: 10,
          type: "TEXT",
        },
      });
      await prisma.taskSet.create({
        data: {
          groupId: group.id,
          title: "Пробная олимпиада · климат",
          description: "Две задачи с автосохранением. Одна попытка, 30 минут.",
          trainingMinutes: 30,
          items: {
            create: [
              { taskId: timed.id, position: 1 },
              { taskId: timedText.id, position: 2 },
            ],
          },
        },
      });
      await prisma.submission.create({
        data: {
          taskId: tasks[0].id,
          studentId: student.id,
          answer: "На юго-востоке находятся горные системы.",
          status: "REVIEWED",
          review: {
            create: {
              score: 6,
              feedback: "Добавьте объяснение тектонических процессов.",
            },
          },
        },
      });
      await prisma.material.create({
        data: {
          groupId: group.id,
          title: "План подготовки",
          description:
            "Повторите рельеф и климат. Затем решите практику и попробуйте олимпиаду на время.",
          type: "TEXT",
        },
      });
    }
    await mkdir("work", { recursive: true });
    await writeFile(
      "work/qa-fixture.json",
      JSON.stringify({
        groupId: group.id,
        teacherId: teacher.id,
        studentId: student.id,
      }),
    );
    console.log("Local QA lessons ready.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
