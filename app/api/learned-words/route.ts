import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { wordId, isLearned } = await request.json();

    if (wordId === undefined) {
      return NextResponse.json({ error: 'Kelime ID\'si gereklidir' }, { status: 400 });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Kelimenin var olup olmadığını kontrol et
    const word = await prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!word) {
      return NextResponse.json({ error: 'Kelime bulunamadı' }, { status: 404 });
    }

    // LearnedWord tablosunu güncelle
    if (isLearned) {
      try {
        // Önce kaydın var olup olmadığını kontrol et
        const existingRecord = await prisma.learnedWord.findUnique({
          where: {
            userId_wordId: {
              userId,
              wordId,
            },
          },
        });

        if (!existingRecord) {
          await prisma.learnedWord.create({
            data: {
              userId,
              wordId,
              isLearned: true
            },
          });
        } else {
          await prisma.learnedWord.update({
            where: {
              userId_wordId: {
                userId,
                wordId,
              },
            },
            data: {
              isLearned: true
            },
          });
        }

        // Eğer kelime öğrenildi olarak işaretlendiyse, ezberlenemeyenlerden kaldır
        await prisma.unlearnedWord.deleteMany({
          where: {
            userId,
            wordId,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Bu kelime zaten öğrenildi olarak işaretlenmiş' }, { status: 400 });
          } else if (error.code === 'P2003') {
            return NextResponse.json({ error: 'Geçersiz kullanıcı veya kelime ID\'si' }, { status: 400 });
          }
        }
        throw error;
      }
    } else {
      try {
        // Kelimeyi öğrenilmemiş olarak işaretle
        await prisma.learnedWord.delete({
          where: {
            userId_wordId: {
              userId,
              wordId,
            },
          },
        });

        // Ezberlenemeyenler listesine ekle
        await prisma.unlearnedWord.upsert({
          where: {
            userId_wordId: {
              userId,
              wordId,
            },
          },
          create: {
            userId,
            wordId,
          },
          update: {},
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            // Kelime zaten öğrenilmemiş durumda, sadece ezberlenemeyenlere ekle
            await prisma.unlearnedWord.upsert({
              where: {
                userId_wordId: {
                  userId,
                  wordId,
                },
              },
              create: {
                userId,
                wordId,
              },
              update: {},
            });
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Günlük hedefi güncelle
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyGoal = await prisma.dailyGoal.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (dailyGoal) {
      await prisma.dailyGoal.update({
        where: { id: dailyGoal.id },
        data: {
          completed: isLearned
        },
      });
    } else {
      await prisma.dailyGoal.create({
        data: {
          userId,
          date: today,
          completed: isLearned,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Kelime durumu güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime durumu güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 