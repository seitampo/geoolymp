import { MaterialType, PrismaClient, Role, SubmissionStatus, TaskType } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  // Чистим данные в порядке, безопасном для внешних ключей. Счётчики id (SERIAL)
  // в PostgreSQL не сбрасываем — для демо-данных конкретные значения id не важны.
  await prisma.review.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.material.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const files = await createSeedFiles();

  const teacher = await prisma.user.create({
    data: {
      name: "Асанали Асаналиев",
      email: "teacher@geoolymp.kz",
      password: await hashPassword("123456"),
      role: Role.TEACHER,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: "Асан Асанов",
      email: "student@geoolymp.kz",
      password: await hashPassword("123456"),
      role: Role.STUDENT,
    },
  });

  const group = await prisma.group.create({
    data: {
      name: "Подготовка к Республиканской олимпиаде по географии",
      description:
        "Демонстрационная группа с материалами, задачами и решениями по физической и экономической географии Казахстана.",
      inviteCode: "KAZ-GEO",
      teacherId: teacher.id,
      memberships: {
        create: { userId: student.id },
      },
    },
  });

  await prisma.material.createMany({
    data: [
      {
        groupId: group.id,
        title: "Атлас Казахстана на Wikimedia Commons",
        description: "Подборка карт Казахстана: физические, административные и исторические карты.",
        type: MaterialType.LINK,
        url: "https://commons.wikimedia.org/wiki/Atlas_of_Kazakhstan",
      },
      {
        groupId: group.id,
        title: "География Казахстана: справочная статья",
        description: "Краткая справка по рельефу, климату, водным ресурсам и природным зонам.",
        type: MaterialType.LINK,
        url: "https://en.wikipedia.org/wiki/Geography_of_Kazakhstan",
      },
      {
        groupId: group.id,
        title: "Физическая география Казахстана",
        description: "PDF-конспект по основным формам рельефа и природным зонам.",
        type: MaterialType.PDF,
        filePath: files.physicalGeographyPdf,
        originalFileName: "physical_geography_kz.pdf",
      },
      {
        groupId: group.id,
        title: "PDF-версия статьи Geography of Kazakhstan",
        description: "Внешний PDF-материал для быстрого чтения и печати.",
        type: MaterialType.LINK,
        url: "https://en.wikipedia.org/api/rest_v1/page/pdf/Geography_of_Kazakhstan",
      },
      {
        groupId: group.id,
        title: "Климат Казахстана",
        description: "Презентация по климатическим поясам и факторам климатообразования.",
        type: MaterialType.PPTX,
        filePath: files.climatePptx,
        originalFileName: "climate_kz.pptx",
      },
      {
        groupId: group.id,
        title: "Гидрография Казахстана",
        description: "Подборка олимпиадных задач по крупнейшим рекам и озёрам.",
        type: MaterialType.DOCX,
        filePath: files.hydrographyDocx,
        originalFileName: "hydrography_tasks.docx",
      },
      {
        groupId: group.id,
        title: "Физическая карта Казахстана",
        description: "Карта для выполнения практических заданий.",
        type: MaterialType.IMAGE,
        filePath: files.kazakhstanMapPng,
        originalFileName: "kazakhstan_map.png",
      },
      {
        groupId: group.id,
        title: "Архив тренировочных материалов",
        description: "ZIP-архив с дополнительными файлами для самостоятельной подготовки.",
        type: MaterialType.ZIP,
        filePath: files.practiceZip,
        originalFileName: "kazakhstan_geography_practice.zip",
      },
    ],
  });

  const textTask = await prisma.task.create({
    data: {
      groupId: group.id,
      title: "Рельеф Казахстана",
      description:
        "Объясните, почему юго-восток Казахстана имеет более сложный и высокогорный рельеф, чем север и запад страны.",
      maxScore: 10,
      type: TaskType.TEXT,
      correctAnswer:
        "Юго-восток связан с горными системами Тянь-Шаня, Жетысу Алатау и Алтая, а север и запад представлены равнинами и низменностями.",
    },
  });

  await prisma.task.createMany({
    data: [
      {
        groupId: group.id,
        title: "Крупнейшее озеро Казахстана",
        description: "Выберите крупнейшее озеро, полностью или частично расположенное на территории Казахстана.",
        maxScore: 5,
        type: TaskType.SINGLE_CHOICE,
        options: ["Балхаш", "Зайсан", "Алаколь", "Маркаколь"].join("\n"),
        correctAnswer: "Балхаш",
      },
      {
        groupId: group.id,
        title: "Пограничные государства Казахстана",
        description: "Отметьте все государства, с которыми Казахстан имеет сухопутную границу.",
        maxScore: 8,
        type: TaskType.MULTIPLE_CHOICE,
        options: ["Россия", "Китай", "Кыргызстан", "Монголия", "Туркменистан", "Узбекистан"].join("\n"),
        correctAnswer: "Китай; Кыргызстан; Россия; Туркменистан; Узбекистан",
      },
      {
        groupId: group.id,
        title: "Практическая работа с картой",
        description:
          "На карте Казахстана подпишите Каспийское море, озеро Балхаш, реку Иртыш и район Тянь-Шаня. Загрузите изображение с разметкой.",
        maxScore: 12,
        type: TaskType.IMAGE_UPLOAD,
        imagePath: files.taskMapPng,
        originalImageName: "kazakhstan_task_map.png",
      },
      {
        groupId: group.id,
        title: "Файл с решением олимпиадной задачи",
        description:
          "Подготовьте файл с расчётом расстояния по масштабу карты и кратким объяснением выбранного метода.",
        maxScore: 15,
        type: TaskType.FILE_UPLOAD,
        correctAnswer: "Файл должен содержать расчёт, единицы измерения и вывод.",
      },
    ],
  });

  const submission = await prisma.submission.create({
    data: {
      taskId: textTask.id,
      studentId: student.id,
      answer:
        "Юго-восток Казахстана расположен в зоне молодых горных сооружений. Здесь находятся Тянь-Шань и Жетысу Алатау, поэтому высоты и расчленённость рельефа больше.",
      status: SubmissionStatus.REVIEWED,
    },
  });

  await prisma.review.create({
    data: {
      submissionId: submission.id,
      score: 9,
      feedback: "Хороший ответ. Для полного балла можно добавить сравнение с Прикаспийской низменностью и Северо-Казахской равниной.",
    },
  });
}

async function createSeedFiles() {
  const materialsDirectory = path.join(process.cwd(), "uploads", "materials");
  const tasksDirectory = path.join(process.cwd(), "uploads", "tasks");

  await mkdir(materialsDirectory, { recursive: true });
  await mkdir(tasksDirectory, { recursive: true });

  const physicalGeographyPdf = path.join("uploads", "materials", "physical_geography_kz.pdf");
  const climatePptx = path.join("uploads", "materials", "climate_kz.pptx");
  const hydrographyDocx = path.join("uploads", "materials", "hydrography_tasks.docx");
  const kazakhstanMapPng = path.join("uploads", "materials", "kazakhstan_map.png");
  const practiceZip = path.join("uploads", "materials", "kazakhstan_geography_practice.zip");
  const taskMapPng = path.join("uploads", "tasks", "kazakhstan_task_map.png");

  await writeFile(path.join(process.cwd(), physicalGeographyPdf), createSimplePdf());
  await writeFile(path.join(process.cwd(), climatePptx), createSimplePptx());
  await writeFile(path.join(process.cwd(), hydrographyDocx), createSimpleDocx());
  await writeFile(path.join(process.cwd(), kazakhstanMapPng), createDemoMapPng());
  await writeFile(
    path.join(process.cwd(), practiceZip),
    createZip([
      {
        name: "readme.txt",
        content: Buffer.from("Демо-архив с тренировочными материалами по географии Казахстана.\n", "utf8"),
      },
      {
        name: "practice_tasks.txt",
        content: Buffer.from("1. Сравните природные зоны Казахстана.\n2. Определите бассейн реки Иртыш.\n", "utf8"),
      },
    ]),
  );
  await writeFile(path.join(process.cwd(), taskMapPng), createDemoMapPng());

  return {
    physicalGeographyPdf,
    climatePptx,
    hydrographyDocx,
    kazakhstanMapPng,
    practiceZip,
    taskMapPng,
  };
}

function createSimplePdf() {
  const content = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj << /Length 132 >> stream",
    "BT /F1 18 Tf 72 720 Td (Physical Geography of Kazakhstan) Tj 0 -36 Td /F1 12 Tf (Relief, natural zones, climate and water resources.) Tj ET",
    "endstream endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 6 >>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");

  return Buffer.from(content, "utf8");
}

function createSimpleDocx() {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    },
    {
      name: "word/document.xml",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Гидрография Казахстана</w:t></w:r></w:p>
    <w:p><w:r><w:t>Демо-задания по рекам Иртыш, Сырдарья, Или и озеру Балхаш.</w:t></w:r></w:p>
  </w:body>
</w:document>`),
    },
  ]);
}

function createSimplePptx() {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`),
    },
    {
      name: "ppt/presentation.xml",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
</p:presentation>`),
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`),
    },
    {
      name: "ppt/slides/slide1.xml",
      content: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/></p:spTree></p:cSld>
</p:sld>`),
    },
  ]);
}

function xml(content: string) {
  return Buffer.from(content.trim(), "utf8");
}

function createZip(files: { name: string; content: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.content.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, file.content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.content.length, 20);
    centralHeader.writeUInt32LE(file.content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + file.content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, end]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createDemoMapPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAlgAAAEgCAIAAADyso9JAAAEjUlEQVR4nO3dQQ3DMAwAQYz7T9YxZAjIgrRH9iQ5mEoT6ebk5OQmAAAAAAAAAAAAAAAAAAAAAAB4tq4P8C/2nN0AAADgZgRggAEGGB4wAMNzoKz7+N3r9V7v9x8AAMANCGEAAgwwPGAAhmfQvQHf1p1mNAAAA2JYQBiDAAMMDBmB4xt0b8H3daUYDAABgW0IYgAADDA8YgOEZd2/A93WnGQ0AAIBtCWEAAgwwPGAAhmfcvQHf151mNAAAA2JYQBiDAAMMDBmB4xt0b8H3daUYDAABgW0IYgAADDA8YgOEZd2/A93WnGQ0AAIBtCWEAAgwwPGAAhmfcvQHf151mNAAAA2JYQBiDAAMMDBmB4xl0d8L3uNKMBAACwLSEMwGQ9z8/Pd/To0RkZGQkJCW7dujXHcSxcuHDp0qV58+YdPnx4+PDh8+bN27dv3+XLl8+fP19fXx8fH1+9evXw4cOHDx8+fPjw4cOHj48PBw8efPjw4cOHj48PHz58+PDhw4cPHz58+PDevXsPHjzYt29fX19fX18fHx8fH7969erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq9evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169erVq1evXr169es/AQAA//8DAEvy2VJjWksAAAAASUVORK5CYII=",
    "base64",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
