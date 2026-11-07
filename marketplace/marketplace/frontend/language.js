const translations = {
  en: {
    'nav-products':'Products','nav-account':'Account','nav-contact':'Contact','nav-about':'About & policies','search':'Search',
    'nav-home':'Home','nav-track':'Track order','nav-sign-in':'Sign in / Join',
    'home-title':'Find something worth keeping.','home-copy':'Thoughtful finds from independent shops, everyday essentials, and one easy checkout.','home-cta':'Explore the marketplace',
    'home-categories':'Explore by category','home-featured':'Featured finds','home-videos':'See products in action','home-catalog':'Shop popular finds',
    'catalog-title':'Shop Cameroon, all in one place.','catalog-copy':'Browse phones, fashion, food and farm produce, home essentials, beauty, tools, school supplies, and more. Prices are displayed in CFA francs (XAF).',
    'catalog-search-title':'Explore products','catalog-search-placeholder':'Search the catalog','catalog-all-categories':'All categories',
    'catalog-live-note':'Listings shown are provided by Marketplace sellers. Confirm availability, condition, delivery, and final terms with the seller.',
    'catalog-featured':'Featured','catalog-price-low':'Price: low to high','catalog-price-high':'Price: high to low','catalog-name':'Name: A to Z',
    'catalog-details':'View details','catalog-preview':'Preview catalog: these are illustrative listings, not confirmed offers. Add your Supabase URL and public anon key in supabase-config.js to load real seller listings.',
    'checkout-title':'Checkout','track-title':'Track your order','language-label':'Language',
    'buyer-name':'Full name','buyer-email':'Email for order updates','buyer-phone':'Phone','buyer-address':'Delivery address and city',
    'payment-method':'Payment method','place-order':'Place order','submit-auth':'Sign in','order-received':'Order received',
    'tracking-code':'Shipment tracking code','find-shipment':'Find shipment','track-copy':'Enter the 32-character shipment code supplied by the seller to view the latest location they have shared.',
    'seller-payment-title':'Seller payment details','save-payment':'Save payment details','seller-orders-title':'Orders for your store',
    'tracking-update-title':'Add a shipment update','share-gps':'Use my current GPS point','publish-update':'Post shipment update',
    'buy-now':'Buy now','language-en':'English','language-fr':'Français',
    'checkout-intro':'Pay the seller directly using the payment instructions they provided. Your contact details are for delivery and order updates only.',
    'payment-note':'The seller—not the buyer—provides their payout details. Buyers select a payment method at checkout. Payment remains pending until the seller independently confirms receipt.',
    'mtn-payment':'MTN Mobile Money','orange-payment':'Orange Money','bank-payment':'Bank transfer',
    'payment-pending-note':'Payment remains pending until the seller independently confirms receipt. Follow these seller-provided instructions and keep your transfer reference.',
    'payment-confirmed-note':'The seller has confirmed your payment. Contact support if you believe this is incorrect.',
    'track-disclaimer':'This map shows the latest GPS point deliberately shared by the seller or carrier. It is not continuous or independently verified GPS tracking. Location sharing should be updated only for the active delivery.',
    'receipt-email-sent':'Order details were emailed to the buyer and seller.','receipt-email-failed':'The order was saved, but an email notification could not be sent. Please contact support if you need help.'
  },
  fr: {
    'nav-products':'Produits','nav-account':'Compte','nav-contact':'Contact','nav-about':'À propos et règles','search':'Rechercher',
    'nav-home':'Accueil','nav-track':'Suivre une commande','nav-sign-in':'Connexion / Inscription',
    'home-title':'Trouvez un produit qui vous plaît.','home-copy':'Des trouvailles de boutiques indépendantes, des essentiels du quotidien et un paiement simple.','home-cta':'Explorer la marketplace',
    'home-categories':'Explorer par catégorie','home-featured':'À la une','home-videos':'Les produits en action','home-catalog':'Découvrir les produits',
    'catalog-title':'Achetez au Cameroun, tout au même endroit.','catalog-copy':'Parcourez téléphones, mode, aliments et produits agricoles, maison, beauté, outils, fournitures scolaires et plus. Prix affichés en francs CFA (XAF).',
    'catalog-search-title':'Explorer les produits','catalog-search-placeholder':'Rechercher dans le catalogue','catalog-all-categories':'Toutes les catégories',
    'catalog-live-note':'Les annonces proviennent des vendeurs de Marketplace. Confirmez auprès du vendeur la disponibilité, l’état, la livraison et les conditions finales.',
    'catalog-featured':'En vedette','catalog-price-low':'Prix : croissant','catalog-price-high':'Prix : décroissant','catalog-name':'Nom : A à Z',
    'catalog-details':'Voir les détails','catalog-preview':'Catalogue de démonstration : ces annonces sont illustratives et ne sont pas des offres confirmées. Configurez Supabase pour afficher les annonces réelles des vendeurs.',
    'checkout-title':'Paiement','track-title':'Suivre votre commande','language-label':'Langue',
    'buyer-name':'Nom complet','buyer-email':'E-mail pour les mises à jour','buyer-phone':'Téléphone','buyer-address':'Adresse de livraison et ville',
    'payment-method':'Mode de paiement','place-order':'Passer la commande','submit-auth':'Connexion','order-received':'Commande reçue',
    'tracking-code':'Code de suivi du colis','find-shipment':'Rechercher le colis','track-copy':'Saisissez le code de suivi de 32 caractères fourni par le vendeur pour consulter sa dernière position partagée.',
    'seller-payment-title':'Coordonnées de paiement du vendeur','save-payment':'Enregistrer les coordonnées','seller-orders-title':'Commandes de votre boutique',
    'tracking-update-title':'Ajouter une mise à jour de livraison','share-gps':'Utiliser ma position GPS actuelle','publish-update':'Publier la mise à jour',
    'buy-now':'Acheter','language-en':'English','language-fr':'Français',
    'checkout-intro':'Payez directement le vendeur avec les coordonnées fournies. Vos coordonnées servent uniquement à la livraison et au suivi de la commande.',
    'payment-note':'Le vendeur, et non l’acheteur, fournit ses coordonnées de paiement. L’acheteur choisit un mode de paiement à la caisse. Le paiement reste en attente jusqu’à confirmation indépendante du vendeur.',
    'mtn-payment':'MTN Mobile Money','orange-payment':'Orange Money','bank-payment':'Virement bancaire',
    'payment-pending-note':'Le paiement reste en attente jusqu’à confirmation indépendante du vendeur. Suivez ces instructions et conservez la référence du transfert.',
    'payment-confirmed-note':'Le vendeur a confirmé votre paiement. Contactez l’assistance en cas d’erreur.',
    'track-disclaimer':'La carte affiche le dernier point GPS partagé volontairement par le vendeur ou le transporteur. Il ne s’agit pas d’un suivi continu ni vérifié de façon indépendante. Le partage de position doit être mis à jour uniquement pendant la livraison.',
    'receipt-email-sent':'Les détails de la commande ont été envoyés à l’acheteur et au vendeur.','receipt-email-failed':'La commande a été enregistrée, mais l’e-mail de notification n’a pas pu être envoyé. Contactez l’assistance si nécessaire.'
  }
};

function applyLanguage(language) {
  const selected = translations[language] ? language : 'en';
  document.documentElement.lang = selected;
  document.querySelectorAll('.language-switch').forEach(select => { select.value = selected; });
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const translated = translations[selected][element.dataset.i18n];
    if (!translated) return;
    const textNode = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = translated;
    else element.textContent = translated;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const translated = translations[selected][element.dataset.i18nPlaceholder];
    if (translated) element.placeholder = translated;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    const translated = translations[selected][element.dataset.i18nAria];
    if (translated) element.setAttribute('aria-label', translated);
  });
  localStorage.setItem('oracle-language', selected);
  document.dispatchEvent(new CustomEvent('oracle-language-change', { detail: { language: selected } }));
}

document.querySelectorAll('.language-switch').forEach(select => {
  select.addEventListener('change', () => applyLanguage(select.value));
});
window.applyMarketplaceLanguage = applyLanguage;
applyLanguage(localStorage.getItem('oracle-language') || 'en');
