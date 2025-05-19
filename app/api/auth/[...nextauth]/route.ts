import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please provide process.env.NEXTAUTH_SECRET');
}

export const authOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Kullanıcı adı ve şifre gerekli');
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          select: {
            id: true,
            username: true,
            password: true,
            email: true,
            emailVerified: true,
            isAdmin: true
          }
        });

        if (!user || !user.emailVerified) {
          console.log('Kullanıcı bulunamadı veya email doğrulanmamış:', credentials.username);
          throw new Error('Kullanıcı bulunamadı veya email doğrulanmamış');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          console.log('Geçersiz şifre:', credentials.username);
          throw new Error('Geçersiz şifre');
        }

        console.log('Başarılı giriş:', user.username, 'Admin:', user.isAdmin);

        return {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isAdmin = user.isAdmin;
        console.log('JWT callback - token:', { ...token, isAdmin: user.isAdmin });
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          username: token.username,
          isAdmin: token.isAdmin
        };
        console.log('Session callback - session:', { 
          ...session, 
          user: { 
            ...session.user, 
            isAdmin: token.isAdmin 
          } 
        });
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (!existingUser) {
            // Rastgele güvenli bir şifre oluştur
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            // Kullanıcı adını email'den oluştur ve benzersiz olmasını sağla
            let baseUsername = user.email.split('@')[0];
            let username = baseUsername;
            let counter = 1;

            // Kullanıcı adının benzersiz olmasını sağla
            while (await prisma.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${counter}`;
              counter++;
            }

            // Yeni kullanıcı oluştur
            await prisma.user.create({
              data: {
                email: user.email,
                username: username,
                password: hashedPassword,
                emailVerified: new Date(), // Google ile giriş yapanlar için otomatik doğrula
                verificationToken: null,
                tokenExpiry: null,
              }
            });
          }
          return true;
        } catch (error) {
          console.error('Google signin error:', error);
          return false;
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 