# MongoDB → PostgreSQL Migration Guide

## ✅ Completed Steps

1. **Prisma installed** (`npm install @prisma/client prisma`)
2. **Prisma schema created** (`prisma/schema.prisma`) with all 19 models
3. **.env configured** for PostgreSQL
4. **New DB connection file** created (`src/lib/db.ts`)

---

## 📋 Next Steps (Required)

### Step 1: Setup PostgreSQL Database

```bash
# Option A: Local PostgreSQL
# Download and install PostgreSQL 15+
# Create a database named "computer_db"

# Option B: Docker (Quick)
docker run --name computer-postgres -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=computer_db -p 5432:5432 -d postgres:15

# Option C: Cloud (Vercel, Railway, Render, AWS RDS, etc.)
# Get connection string and update .env DATABASE_URL
```

### Step 2: Update `.env` with correct PostgreSQL credentials

```env
DATABASE_URL="postgresql://user:password@localhost:5432/computer_db"
```

### Step 3: Run Prisma Migrations

```bash
# Generate migration files
npm run prisma migrate dev --name init

# Or for production (without seed)
npm run prisma migrate deploy
```

### Step 4: Replace MongoDB imports with Prisma

**Old (Mongoose):**
```typescript
import { connectDB } from "@/lib/mongodb";
import { Student } from "@/models/Student";

await connectDB();
const students = await Student.find({});
```

**New (Prisma):**
```typescript
import { db } from "@/lib/db";

const students = await db.atcStudent.findMany({});
```

### Step 5: Update API Routes

Replace all Mongoose queries with Prisma equivalents:

```typescript
// FIND
await db.atcStudent.findMany({ where: { atcId: id } })
await db.atcStudent.findUnique({ where: { id } })
await db.atcStudent.findFirst({ where: {} })

// CREATE
await db.atcStudent.create({ data: {...} })

// UPDATE
await db.atcStudent.update({ where: { id }, data: {...} })
await db.atcStudent.updateMany({ where: {...}, data: {...} })

// DELETE
await db.atcStudent.delete({ where: { id } })
await db.atcStudent.deleteMany({ where: {...} })

// COUNT
await db.atcStudent.count({ where: {...} })

// AGGREGATE
await db.atcStudent.aggregate({ where: {...}, _count: true })
```

### Step 6: Add Prisma scripts to `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma": "prisma",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "node prisma/seed.js"
  }
}
```

### Step 7: Remove Mongoose

```bash
npm uninstall mongoose
```

---

## 🔄 Model Mapping Reference

| Mongoose | Prisma |
|----------|--------|
| `new Schema({...})` | `model {...}` |
| `model.find()` | `db.modelName.findMany()` |
| `model.findById()` | `db.modelName.findUnique({ where: { id } })` |
| `model.create()` | `db.modelName.create({ data: {...} })` |
| `model.updateOne()` | `db.modelName.update()` |
| `model.deleteOne()` | `db.modelName.delete()` |
| `model.deleteMany()` | `db.modelName.deleteMany()` |
| `ObjectId` | `String` (cuid() or uuid()) |
| `timestamps: true` | `createdAt DateTime @default(now())` |

---

## 📝 API Route Migration Examples

### Example 1: Student Registration

**Before (Mongoose):**
```typescript
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";

export async function POST(req: Request) {
  await connectDB();
  const data = await req.json();
  const student = await AtcStudent.create(data);
  return Response.json(student);
}
```

**After (Prisma):**
```typescript
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const data = await req.json();
  const student = await db.atcStudent.create({ data });
  return Response.json(student);
}
```

### Example 2: Get Students by ATC

**Before:**
```typescript
const students = await Student.find({ atcId: req.query.atcId });
```

**After:**
```typescript
const students = await db.atcStudent.findMany({
  where: { atcId: req.query.atcId as string },
});
```

### Example 3: Complex Query with Relations

**Before:**
```typescript
const exam = await StudentExam.findById(examId).populate("student").populate("questionSet");
```

**After:**
```typescript
const exam = await db.studentExam.findUnique({
  where: { id: examId },
  include: { student: true, questionSet: true },
});
```

---

## ⚠️ Important Notes

1. **No old data** - Schema is clean, ready for fresh start
2. **Connection pooling** - Prisma handles this automatically
3. **Transactions** - Use `db.$transaction()` for multi-step operations
4. **Performance** - Add indexes in schema as needed (already done for common queries)
5. **Backups** - Always backup PostgreSQL before migrations

---

## 🐛 Common Issues & Fixes

### Issue: "DATABASE_URL not set"
**Fix:** Ensure `.env` has `DATABASE_URL` variable

### Issue: "relation does not exist"
**Fix:** Run `npx prisma migrate dev` to create tables

### Issue: Prisma client out of sync
**Fix:** Run `npx prisma generate`

### Issue: Connection timeout
**Fix:** Ensure PostgreSQL is running and credentials are correct

---

## 📚 Prisma Documentation
- [Query API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
