import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please provide process.env.NEXTAUTH_SECRET');
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account"
        }
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        if (!user || !user.emailVerified) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        };
      }
    })
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (!existingUser) {
            // Google profil bilgisinden username oluştur
            const suggestedUsername = profile?.name ? 
              profile.name.replace(/\s+/g, '').toLowerCase() : 
              user.email.split('@')[0];

            // Username'in benzersiz olduğundan emin ol
            let finalUsername = suggestedUsername;
            let counter = 1;
            while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
              finalUsername = `${suggestedUsername}${counter}`;
              counter++;
            }

            await prisma.user.create({
              data: {
                email: user.email,
                username: finalUsername,
                emailVerified: new Date(),
                password: '',
              }
            });
          }
          return true;
        } catch (error) {
          console.error('Google sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token) {
        const user = await prisma.user.findUnique({
          where: { email: token.email }
        });

        if (user) {
          session.user = {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
          };
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.username = user.username;
      }
      return token;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 