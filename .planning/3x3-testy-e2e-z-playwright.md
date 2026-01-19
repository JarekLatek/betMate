---
title: "[3x3] Testy E2E z Playwright"
course: "10xdevs-2"
source: "Przeprogramowani.pl"
exported: "2026-01-19"
format: "markdown"
---

![Ilustracja z lekcji](https://assets-v2.circle.so/13k0sn4iglzzzv9b5lqmxs2x6gs7)

## Wprowadzenie

Kolejny zestaw testów posłuży nam do testowania funkcjonalności biznesowych i ścieżek użytkownika - nie będziemy tutaj analizować struktury komponentów i zawartości tablic lub obiektów, ale przetestujemy poruszanie się po całej aplikacji i realizację wymagań z PRD.

Zgodnie z Test Planem, wykorzystamy do tego narzędzie [Playwright](https://playwright.dev/docs/intro). Aby zwiększyć stabilność testów e2e i umożliwić odtwarzalność scenariuszy, wystawimy niezależną bazę zgodnie z rekomendacjami uzyskanymi od Claude:

```
## Rekomendowane podejście
Najlepszą praktyką jest hybrydowe podejście wykorzystujące zarówno bazę lokalną jak i projekty chmurowe:

Development: Lokalne Supabase poprzez supabase-cli
Testy: Lokalne Supabase dla testów jednostkowych i integracyjnych + dedykowany projekt chmurowy dla testów e2e
Staging: Dedykowany projekt chmurowy
Produkcja: Dedykowany projekt chmurowy
```

### Konfiguracja bazy chmurowej

W planie darmowym Supabase możemy utrzymywać dwa projekty chmurowe. Pierwszy z nich wykorzystamy właśnie do testów e2e.

Rozpocznijmy od wejścia na <https://supabase.com/dashboard/projects>, założenia darmowego konta i utworzenia nowego projektu “New project”:

![Ilustracja z lekcji](https://assets-v2.circle.so/fgnjm6j5ztbk2e5jjmsh7wa9x5mt)

**👉 WAŻNE:** Przy tworzeniu projektu zostaniesz poproszony o “database password” - wprowadź tę wartość i przechowuj w bezpieczny sposób. Wykorzystamy ją do odtworzenia schematu z istniejących migracji.

Po utworzeniu projektu uzyskasz dwie wartości, które powinieneś przenieść do projektu:

1) Project URL

2) Public key

![Ilustracja z lekcji](https://assets-v2.circle.so/iw09xc7vq6a51tjqz5hi2ppfa70o)

Przy kolejnych wizytach w panelu Supabase, obie wartości odnajdziesz klikając “Connect” w sekcji nawigacji, na samej górze strony. W efekcie otworzy się okno prezentujące najważniejsze dane:

![Ilustracja z lekcji](https://assets-v2.circle.so/qe33fdjzklw1pjkvca8kraljn2p0)

W 10xRules obie zmienne przeniosłem do pliku .env.test, który ma taki sam kształt jak .env wykorzystywany do lokalnego developmentu (dodaj ten plik do .**gitignore i** [**.cursorignore**](https://docs.cursor.com/context/ignore-files)):

```
SUPABASE_URL=###
SUPABASE_PUBLIC_KEY=###
```

Będąc jeszcze na Dashboardzie, w nowym projekcie utwórz testowego użytkownika pod E2E:

- Przejdź do sekcji Authentication > Users
- Kliknij "Add user"
- Wprowadź ręcznie login i hasło (będziemy z nich korzystać w konfiguracji testów)

![Ilustracja z lekcji](https://assets-v2.circle.so/62dkv3kz8a4bs50muat9t3be2qg2)

Jego dane możesz dodać na koniec pliku **.env.test**:

```
E2E_USERNAME_ID=###
E2E_USERNAME=###
E2E_PASSWORD=###
```

W momencie, kiedy dany scenariusz będzie wymagał logowania użytkownika, korzystaj z tych danych na poziomie testów.

Aplikacja Astro może być uruchomiona z tymi zmiennymi poprzez nowy skrypt w package.json:

```
"dev:e2e": "astro dev --mode test",
```

### Migracja schematu bazy

Nowa baza nie zawiera jeszcze żadnych tabel na dane. Przed napisaniem testów wyrównajmy jej stan z bazą, z którą pracowaliśmy do tej pory.

W tym celu wykorzystaj Supabase CLI przechodząc na nowy projekt (supabase link), logując się uzyskanym hasłem do bazy (NIE: hasłem użytkownika) i zastosuj migracje:

```
# Wybierz bazę do testów e2e (opcjonalnie: podaj ID projektu)
supabase link --project-ref *********

# Poczekaj na potwierdzenie ...

## Wykonaj migrację na bazie e2e
supabase db push

# Potwierdź zatosowanie migracji i poczekaj na ukończenie procesu:
# Applying migration ...
# Finished supabase db push.
```

Całość możesz potwierdzić sprawdzając, czy w nowym projekcie pojawiła się wymagana tabela:

![Ilustracja z lekcji](https://assets-v2.circle.so/dbkehfkkd87ht4ecqz27hknpxpyo)

### Testowanie z Playwright

Poziom trudności testowania E2E z AI będzie jak zwykle mocno zależny od stopnia złożoności projektu oraz tego, na jakie optymalizacje chcemy się zdecydować w samych testach. Na początku przedstawię ci ogólne podejście do testowania, a następnie zwrócę uwagę na dwa dodatkowe elementy, które prawdopodobnie warto będzie dodać w scenariuszach produkcyjnych.

Cały proces podzielę na następujące etapy:

1. Identyfikacja komponentów / stron biorących udział w danym scenariuszu
2. Dodanie selektorów \`[data-testid](https://playwright.dev/docs/api/class-page#page-get-by-test-id)\` do wybranych elementów UI

**👉 Ważne:** Dodawanie selektorów wewnątrz komponentów, a nie na zewnątrz (w miejscu stosowania w komponencie nadrzędnym), zapewni największą kompatybilność i precyzję działania AI. 

```
<!-- Źle -->
<!-- Layout.tsx -->
<Topbar client:load data-testid="topbar" /> 

<!-- Dobrze -->
<!-- Topbar.tsx -->
return (

   ...
  </header>
)
```

1. Zbudowanie tzw. “Page Object Modeli” - szczegóły tego wzorca [pod tym linkiem](https://playwright.dev/docs/pom)
2. Wygenerowanie docelowego scenariusza testów
3. Ewentualne korekty w zależności od efektu finalnego

Zobacz, jak to wygląda w praktyce:

🎥 **VIDEO**: [Watch here](https://player.vimeo.com/video/1071525278?app_id=122963&byline=0&badge=0&portrait=0&title=0)

**👉 Ważne:** W przypadku aplikacji z większą liczbą stron (np. w twoim projekcie), POMy będą zwykle reprezentować większe części aplikacji (strony) a nie pojedyncze komponenty. Jako, że w 10xRules wszystko odbywa się na jednej stronie, zdecydowałem się na małą zmianę podejścia.

Reguły dla Playwright znajdziesz poniżej:

[playwright-e2e-testing.mdc](https://assets-v2.circle.so/j4hglbhml3clcka1jmus5j1v2mts)

Aby playwright brał pod uwagę konfigurację z .env.test, dodaję do projektu bibliotekę dotenv i rozszerzam konfigurację o nowy fragment:

```
// playwright.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
```

### Optymalizacja procesu logowania

W pierwszym podejściu do implementacji testów E2E, każdy test wymagający logowania może korzystać z danych użytkownika testowego, dostępnego w bazie testowej. Kod może się tymczasowo powielać, a ty dzięki temu możesz się skupić na implementacji docelowych scenariuszy.

W kolejnym kroku możesz wdrożyć optymalizację - o ile na starcie logowanie może być stałym elementem każdego testu, to w dużej skali, kiedy złożoność projektu wystrzeli w górę, będziesz chciał się tego kroku pozbyć i używać:

a) sesji generowanej raz i zapisanej do ponownego reużycia

b) logowania poprzez API, co pozwoli oszczędzić czas na nawigację po UI

Pozostawiamy tę optymalizację dla chętnych - w przystępny sposób opisuje je dokumentacja:

[Authentication | Playwright](https://playwright.dev/docs/auth)

### Teardown

Problem, z którym zmierzymy się na samym końcu, to czyszczenie tabel w których znajdują się dane utworzone w trakcie testów.

Zrealizujemy to poprzez tzw. [teardown](https://playwright.dev/docs/test-global-setup-teardown#teardown), czyli mechanizm “usuwania śladów” jakie pozostawiają po sobie nasze testy e2e. Na poniższym filmie zobaczysz jak model AI wspieramy [rzeczywistą dokumentacją](https://github.com/microsoft/playwright/blob/main/docs/src/test-global-setup-teardown-js.md) w formacie Markdown, którą pobieramy z otwartego repozytorium.

🎥 **VIDEO**: [Watch here](https://player.vimeo.com/video/1071525036?app_id=122963&byline=0&badge=0&portrait=0&title=0)

Aby zapobiec problemom z Row-Level Security [bez używania “Service Role Key”](https://supabase.com/docs/guides/api/api-keys), twój klient Supabase powinien też wcześniej wykonać logowanie do tego samego konta, z którego dodawane są dane w trakcie testów. Dzięki temu nie będzie problemu z ich usuwaniem po przeprowadzeniu całej sesji e2e.

```
const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_USERNAME!,
      password: process.env.E2E_PASSWORD!,
});

if (signInError) {
    console.error('Error signing in:', signInError);
    throw signInError;
}
```

Uwaga - obrana strategia nie sprawdzi się kiedy nad jednym projektem pracuje równolegle kilku programistów. Wtedy czyszczenie tabel po ukończeniu twojej sesji e2e będzie powodować niestabilność testów, które akurat są w trakcie działania u innych.

W takich sytuacjach możesz rozważyć niezależnych użytkowników pod e2e, włączenie [Supabase Branching](https://supabase.com/docs/guides/deployment/branching) albo inne podejście do czyszczenia tabel testowych (np. niezależną automatyzacją, cyklicznie, o północy, etc.). 

Zarówno testy jak i konkretne podejście do czyszczenia danych wraz z zabezpieczeniami warto dostosować do projektu. Nieprzypadkowo mówi się, że warunki produkcyjne istnieją tylko na (i blisko) produkcji ;)

## 🏁 Podsumowanie lekcji

Właśnie poznałeś kilka strategii efektywnej współpracy z modelami AI podczas tworzenia testów. 

Jasne komunikowanie kontekstu okazało się fundamentem sukcesu - zamiast oczekiwać, że AI samo odkryje niuanse naszej architektury, proaktywnie dostarczaliśmy opisy testowanych komponentów i ich zależności, co znacząco podnosiło trafność generowanych rozwiązań.

Wartościowym podejściem było wykorzystanie trybu agentowego, gdzie AI mogło przeszukiwać projekt. 

Rozpoczynając od prostego polecenia "W formacie ASCII przedstaw strukturę komponentów", uzyskiwaliśmy przejrzysty widok zależności, który stanowił podstawę do dalszych decyzji. Równie istotna okazała się umiejętność korekty propozycji AI. Usuwanie zbędnych testów i przechodzenie na "inline edit" dla zapewnienia zgodności typów pokazuje, że współpraca czasami wymaga krytycznego feedbacku.

Kluczową obserwacją jest sposób, w jaki łączyliśmy różne źródła wiedzy - wykorzystując zarówno GitIngest do analizy kodu, modele z dużym oknem kontekstowym do generowania scenariuszy testowych, jak i rzeczywistą dokumentację techniczną w formacie Markdown.

Ta strategia hybrydowa, gdzie AI służy jako partner w burzy mózgów, wspierany faktycznymi dokumentami technicznymi, pozwala tworzyć kompletne i niezawodne rozwiązania testowe, jednocześnie maksymalizując efektywność pracy programisty.

## 👨‍💻 Ćwiczenia praktyczne

### **Zadanie 1: Konfiguracja i implementacja Testów E2E**

**Cel:** Wprowadź testy E2E do projektu oparte o dedykowaną bazę danych.

**Instrukcje:**

1. Utwórz nowy projekt na Supabase - chmurową bazę pod testy E2E.
2. Przygotuj dedykowaną konfigurację użytkownika i połączenia z bazą testową.
3. Wybierz jeden ze scenariuszy i dodaj dla niego testowe selektory elementów UI.
4. Zaimplementuj jeden lub kilka testów E2E współpracując z AI.
![Ilustracja z lekcji](https://assets-v2.circle.so/ekrtcr8j44qd531ut1i2iwox5c9h)