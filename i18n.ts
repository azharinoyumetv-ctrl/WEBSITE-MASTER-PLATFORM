import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
 
const locales = ['en', 'id'];
 
export default getRequestConfig(async ({locale}) => {
  let resolvedLocale = locale;
  if (!resolvedLocale || resolvedLocale === 'undefined') {
    const headersList = await headers();
    resolvedLocale = headersList.get('x-next-intl-locale') || 'en';
  }

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(resolvedLocale as any)) {
    notFound();
  }
 
  const messages = (await import(`./messages/${resolvedLocale}.json`)).default;
  
  return {
    locale: resolvedLocale,
    messages
  };
});
