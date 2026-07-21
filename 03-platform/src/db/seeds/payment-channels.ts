export const paymentChannels = [
    // Safaricom
    {
      paymentProviderCode: "SAFARICOM",
      code: "STK_PUSH",
      name: "STK Push",
      description: "Customer authorises payment on mobile phone",
      displayOrder: 1,
      isActive: true,
    },
    {
      paymentProviderCode: "SAFARICOM",
      code: "PAYBILL",
      name: "Paybill",
      description: "Customer pays via Paybill Number",
      displayOrder: 2,
      isActive: true,
    },
    {
      paymentProviderCode: "SAFARICOM",
      code: "BUY_GOODS",
      name: "Buy Goods (Till)",
      description: "Customer pays via Till Number",
      displayOrder: 3,
      isActive: true,
    },
  
    // Equity Bank
    {
      paymentProviderCode: "EQUITY_BANK",
      code: "MOBILE_APP",
      name: "Mobile Banking",
      description: "Payment initiated via mobile banking app",
      displayOrder: 10,
      isActive: true,
    },
    {
      paymentProviderCode: "EQUITY_BANK",
      code: "INTERNET_BANKING",
      name: "Internet Banking",
      description: "Payment initiated via web banking",
      displayOrder: 11,
      isActive: true,
    },
    {
      paymentProviderCode: "EQUITY_BANK",
      code: "BRANCH",
      name: "Branch",
      description: "Payment initiated at a branch",
      displayOrder: 12,
      isActive: true,
    },
    {
      paymentProviderCode: "EQUITY_BANK",
      code: "POS",
      name: "POS Terminal",
      description: "Payment initiated from a POS terminal",
      displayOrder: 13,
      isActive: true,
    },
  ];