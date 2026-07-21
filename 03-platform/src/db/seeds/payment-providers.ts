export const paymentProviders = [
    // Mobile Money
    {
      paymentNetworkCode: "MPESA",
      code: "SAFARICOM",
      name: "Safaricom PLC",
      description: "M-Pesa Service Provider",
      displayOrder: 1,
      isActive: true,
    },
    {
      paymentNetworkCode: "AIRTEL_MONEY",
      code: "AIRTEL_KE",
      name: "Airtel Kenya",
      description: "Airtel Money Provider",
      displayOrder: 2,
      isActive: true,
    },
  
    // Card
    {
      paymentNetworkCode: "VISA",
      code: "EQUITY_BANK",
      name: "Equity Bank",
      description: "Visa Issuer",
      displayOrder: 10,
      isActive: true,
    },
    {
      paymentNetworkCode: "VISA",
      code: "KCB_BANK",
      name: "KCB Bank",
      description: "Visa Issuer",
      displayOrder: 11,
      isActive: true,
    },
  
    // RTGS
    {
      paymentNetworkCode: "RTGS",
      code: "EQUITY_BANK_RTGS",
      name: "Equity Bank",
      description: "RTGS Participant",
      displayOrder: 20,
      isActive: true,
    },
    {
      paymentNetworkCode: "RTGS",
      code: "KCB_BANK_RTGS",
      name: "KCB Bank",
      description: "RTGS Participant",
      displayOrder: 21,
      isActive: true,
    },
  ];