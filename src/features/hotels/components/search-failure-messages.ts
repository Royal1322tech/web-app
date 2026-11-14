import type { B2BSearchFailure } from "../api/b2b-hotel-search";

type Text = [en: string, ar: string];

/** One message per search failure, in English and Arabic. Server wording is never shown. */
export const searchFailureMessages: Record<B2BSearchFailure, { title: Text; description: Text; retry: boolean }> = {
  signed_out: {
    title: ["Your session has ended", "انتهت جلستك"],
    description: ["Sign in again to search hotels.", "سجّل الدخول مرة أخرى للبحث عن الفنادق."],
    retry: false,
  },
  forbidden: {
    title: ["Hotel search isn't enabled for your account", "البحث عن الفنادق غير مفعّل لحسابك"],
    description: ["Your company account doesn't have access to hotel search. Contact us to enable it.", "لا يملك حساب شركتك صلاحية البحث عن الفنادق. تواصل معنا لتفعيلها."],
    retry: false,
  },
  validation: {
    title: ["Check your search", "راجع بيانات البحث"],
    description: ["Some search details weren't accepted. Check the dates, nationality and guests, then search again.", "لم يتم قبول بعض بيانات البحث. راجع التواريخ والجنسية والنزلاء، ثم ابحث مرة أخرى."],
    retry: false,
  },
  rate_limited: {
    title: ["Too many searches", "عدد كبير من عمليات البحث"],
    description: ["Please wait a minute before searching again.", "يرجى الانتظار دقيقة قبل البحث مرة أخرى."],
    retry: true,
  },
  supplier_unavailable: {
    title: ["Hotel search is unavailable", "البحث عن الفنادق غير متاح"],
    description: ["Online hotel search isn't available right now. Please try again later or contact us for help with your booking.", "البحث عن الفنادق عبر الإنترنت غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل معنا للمساعدة في الحجز."],
    retry: true,
  },
  not_ready: {
    title: ["Search results aren't ready", "نتائج البحث غير جاهزة"],
    description: ["The hotel search is still being prepared. Please try again in a moment.", "لا يزال البحث عن الفنادق قيد التجهيز. يرجى المحاولة بعد قليل."],
    retry: true,
  },
  network: {
    title: ["Can't reach hotel search", "تعذر الوصول إلى البحث عن الفنادق"],
    description: ["Check your internet connection and try again.", "تحقق من اتصالك بالإنترنت وحاول مرة أخرى."],
    retry: true,
  },
  timeout: {
    title: ["The search took too long", "استغرق البحث وقتاً طويلاً"],
    description: ["Hotel search didn't respond in time. Please try again.", "لم يستجب البحث عن الفنادق في الوقت المحدد. يرجى المحاولة مرة أخرى."],
    retry: true,
  },
  unavailable: {
    title: ["Hotel search is unavailable", "البحث عن الفنادق غير متاح"],
    description: ["Something went wrong on our side. Please try again later.", "حدث خطأ من جهتنا. يرجى المحاولة لاحقاً."],
    retry: true,
  },
  unexpected: {
    title: ["Results can't be displayed", "تعذر عرض النتائج"],
    description: ["We received a response we couldn't read, so no hotels are shown. Please try again later.", "تلقينا رداً لم نتمكن من قراءته، لذلك لا تظهر أي فنادق. يرجى المحاولة لاحقاً."],
    retry: true,
  },
};
