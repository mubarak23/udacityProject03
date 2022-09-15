/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/camelcase */
const format = require("string-template")
import * as fs from 'fs'

import { User } from '../entity/User';
import { IBuyerInvite } from '../interfaces/IBuyerInvite';
import * as ConfigPropertyService from '../services/configPropertyService';
import NotificationMessageTypes from '../enums/NotificationMessageTypes';
import { NotificationMetadata } from '../interfaces/NotificationMetadata';
import { OtpMailInfo } from '../interfaces/OtpMailInfo';
import { WelcomeMailData } from '../interfaces/WelcomeMailData';
import * as Utils from "../utils/core"
import logger from '../logger'
import { Order } from '../entity/Order';
import { Product } from '../entity/Product';
import { QuoteRequest } from '../entity/QuoteRequest';
import { IBuyerAccept } from '../interfaces/IBuyerAccept';
import ConfigProperties from '../enums/ConfigProperties';
import { getFreshConnection } from '../db';
import { CartItemJson } from '../interfaces/CartItemJson';
import { PickupLocation } from '../entity/PickupLocation';
import { OrderReceiveTypes } from '../enums/OrderReceiveTypes';
import { getRepository } from 'typeorm';
import { DeliveryLocation } from '../entity/DeliveryLocation';


export const sendCustomerOtp = async (userMailInfo: OtpMailInfo): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const otpMailHtmlFilePath = `${__dirname}/../emailTemplates/otpmail.html`    
    const otpMailHtmlContent = fs.readFileSync(otpMailHtmlFilePath, 'utf8')

    const msg = {
      to: userMailInfo.email,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `Signup - OTP`,
      html: format(otpMailHtmlContent, {
        customerFirstName: userMailInfo.firstName,
        otp: userMailInfo.otp
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendWelcomeMail = async (userMailInfo: WelcomeMailData): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const welcomeMailHtmlFilePath = `${__dirname}/../emailTemplates/welcomemail.html`    
    const welcomeMailHtmlContent = fs.readFileSync(welcomeMailHtmlFilePath, 'utf8')

    const msg = {
      to: userMailInfo.email,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `Welcome to CinderBuild`,
      html: format(welcomeMailHtmlContent, {
        customerFirstName: userMailInfo.firstName,
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendOrderDetailsMailtoAdmin = async (buyerDetail: User, orderDetail: Order): Promise<boolean> => {
  try {
    const firstOrderItem: CartItemJson = orderDetail.orderItems[0]
    const firstProductUuid = firstOrderItem.productUuid

    const connection = await getFreshConnection()
    const productRepo = await connection.getRepository(Product)
    const firstProduct = await productRepo.findOne({
      where: {
        uuid: firstProductUuid,
      },
      join: {
        alias: "product",
        leftJoinAndSelect: {
          user: "product.user",
          category: "product.category",
          brand: "product.brand",
        },
      },
    })
    const sellerUser = firstProduct.user

    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const OrderDetailsMailHtmlFilePath = `${__dirname}/../emailTemplates/orderdetailmail.html`    
    const OrderDetailsMailHtmlContent = fs.readFileSync(OrderDetailsMailHtmlFilePath, 'utf8')

    const msg = {
      to: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `CinderBuild - Order Details`,
      html: format(OrderDetailsMailHtmlContent, {
        buyerId: buyerDetail.id,
        buyerName: buyerDetail.firstName,
        buyerEmailAddress: buyerDetail.emailAddress,
        buyerPhoneNumber: buyerDetail.phoneNumber,
        sellerId: sellerUser.id,
        sellerName: sellerUser.firstName,
        sellerEmailAddress: sellerUser.emailAddress,
        sellerPhoneNumber: sellerUser.phoneNumber,
        orderRef: orderDetail.referenceNumber,
        OffTakeMode: orderDetail.orderReceiveType,
        category: firstProduct.category.name,
        name: firstProduct.name,
        sellerPrice: firstOrderItem.unitPrice,
        buyerPrice: firstOrderItem.unitPriceForBuyer,
        totalCost: orderDetail.calculatedTotalCostMajor
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendQouteRequestDetailsMail = async (buyerDetail:User, 
    qouteRequestDetail: QuoteRequest, sellerDetail: User, productDetail: Product): Promise<boolean> => {
  try {
    let sellerPickupLocation 
    if(qouteRequestDetail.orderReceiveType === OrderReceiveTypes.PICKUP){
      const pickupLocationRepo = getRepository(PickupLocation);
      sellerPickupLocation = await pickupLocationRepo.findOne({ uuid: qouteRequestDetail.sellerPickupLocationUuid})
    }
  
    console.log(sellerPickupLocation)
    const quoteState = qouteRequestDetail.orderReceiveType === "PICKUP" ?  sellerPickupLocation.address: qouteRequestDetail.deliverAddress
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const QouteRequestDetailsMailHtmlFilePath = `${__dirname}/../emailTemplates/qouterequestmail.html`    
    const QouteRequestMailHtmlContent = fs.readFileSync(QouteRequestDetailsMailHtmlFilePath, 'utf8')

    const msg = {
      to: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: 'CinderBuild - Qoute Request Details',
      html: format(QouteRequestMailHtmlContent, {
        buyerId: buyerDetail.id,
        buyerName: buyerDetail.firstName,
        buyerEmailAddress: buyerDetail.emailAddress,
        buyerPhoneNumber: buyerDetail.phoneNumber,
        sellerId: sellerDetail.id,
        sellerName: sellerDetail.firstName,
        sellerEmailAddress: sellerDetail.emailAddress,
        sellerPhoneNumber: sellerDetail.phoneNumber,
        referenceNumber: qouteRequestDetail.id,
        quantity: qouteRequestDetail.quantity,
        productName: productDetail.name,
        OffTakeMode: qouteRequestDetail.orderReceiveType,
        PickUpState: quoteState
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}


export const sellerQouteRequestResponseMail = async (sellerDetail:User, 
  qouteRequestDetail: QuoteRequest, buyerDetail: User, productDetail: Product, sellerResponse: any): Promise<boolean> => {
try {
  let sellerPickupLocation 
  if(qouteRequestDetail.orderReceiveType === OrderReceiveTypes.PICKUP){
    const pickupLocationRepo = getRepository(PickupLocation);
    sellerPickupLocation = await pickupLocationRepo.findOne({ uuid: qouteRequestDetail.sellerPickupLocationUuid})
  }

  console.log(sellerPickupLocation)
  const quoteState = qouteRequestDetail.orderReceiveType === "PICKUP" ?  sellerPickupLocation.address: qouteRequestDetail.deliverAddress
  
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const QouteRequestDetailsMailHtmlFilePath = `${__dirname}/../emailTemplates/qouterequestresponse.html`    
  const QouteRequestMailHtmlContent = fs.readFileSync(QouteRequestDetailsMailHtmlFilePath, 'utf8')

  const msg = {
    to: "cb_support@cinderbuild.com",
    from: "admin@cinderbuild.com",
    subject: 'CinderBuild - Qoute Request Response',
    html: format(QouteRequestMailHtmlContent, {
      buyerId: buyerDetail.id,
      buyerName: buyerDetail.firstName,
      buyerEmailAddress: buyerDetail.emailAddress,
      buyerPhoneNumber: buyerDetail.phoneNumber,
      sellerId: sellerDetail.id,
      sellerName: sellerDetail.firstName,
      sellerEmailAddress: sellerDetail.emailAddress,
      sellerPhoneNumber: sellerDetail.phoneNumber,
      referenceNumber: qouteRequestDetail.referenceNumber,
      quantity: qouteRequestDetail.quantity,
      productName: productDetail.name,
      OffTakeMode: qouteRequestDetail.orderReceiveType,
      PickUpState:  quoteState,
      sellerPrice: sellerResponse.unitPrice,
      buyerPrice: sellerResponse.unitPriceForBuyer, 
      totalCost: qouteRequestDetail.calculatedTotalCostMajor
    }),
  };

  await sgMail.send(msg)
  return true
} catch (e) {
  logger.error('Sendgrid error: ', e.message)
  return false
}
}




export const sendSellerInviteToBuyer= async (InviteInfo: IBuyerInvite): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const sendSellerInviteToBuyerMailHtmlFilePath = `${__dirname}/../emailTemplates/sellerinvitemail.html`    
    const sendSellerInviteToBuyerMailHtmlContent = fs.readFileSync(sendSellerInviteToBuyerMailHtmlFilePath, 'utf8')
    const domain = Utils.serverDomain()
    const inviteLink = `https://${domain}/invite/${InviteInfo.sellerUnique}`

    const msg = {
      to: InviteInfo.buyerEmail,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `CinderBuild - ${InviteInfo.sellerFirstName} would like to add you as a customer`,
      html: format(sendSellerInviteToBuyerMailHtmlContent, {
        buyerFirstName: InviteInfo.buyerFirstName,
        // eslint-disable-next-line no-constant-condition
        inviteLink: inviteLink,
        sellerFirstName: InviteInfo.sellerFirstName,
        organizaionName: InviteInfo.sellerBusinessName
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendBuyerAcceptInvite = async (AcceptInfo: IBuyerAccept): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const sendBuyerAcceptInviteMailHtmlFilePath = `${__dirname}/../emailTemplates/buyeracceptinvite.html`    
    const sendBuyerAcceptInviteHtmlContent = fs.readFileSync(sendBuyerAcceptInviteMailHtmlFilePath, 'utf8')

    const msg = {
      to: AcceptInfo.SellerEmail,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `CinderBuild - Invite accepted`,
      html: format(sendBuyerAcceptInviteHtmlContent, {
        buyerFirstName: AcceptInfo.buyerFirstName,
        sellerFirstName: AcceptInfo.SellerFirstName,
      }),
    };

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendCustomerEnabledForPlp = async (customer: User): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const plpEnabledHtmlFilePath = `${__dirname}/../emailTemplates/plpEnabled.html`    
    const plpEnabledHtmlContent = fs.readFileSync(plpEnabledHtmlFilePath, 'utf8')

    const msg = {
      to: customer.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: `PLP Enabled `,
      html: format(plpEnabledHtmlContent, {customerFirstName: customer.firstName}),
    }
    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendOrderPaymentMailToBuyer = async (orderUser: User, orderDetails: Order, title: string): Promise<boolean> => {
  try {    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const orderPaymentMailFilePath = `${__dirname}/../emailTemplates/ordercreation.html`    
    const orderPaymentMailHtmlContent = fs.readFileSync(orderPaymentMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const orderTrackURL = `https://${domain}/buyer/orders/${orderDetails.uuid}`
    const msg = {
      to: orderUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: title,
      html: format(orderPaymentMailHtmlContent, {
        customerFirstName: orderUser.firstName, 
        referenceNumber: orderDetails.referenceNumber,
        orderTrackURL: orderTrackURL
      }),
    }
    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendOrderCreationMailToSeller = async (sellerUser: User, orderDetails: Order, title: string): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    console.log(orderDetails)
    console.log('----------')
    console.log('sellerUser')
    console.log(sellerUser)
    const orderCreationMailFilePath = `${__dirname}/../emailTemplates/orderpayment.html`    
    const orderCreationMailHtmlContent = fs.readFileSync(orderCreationMailFilePath, 'utf8')
    const domain = Utils.serverDomain()
    const orderLink = `https://${domain}/seller/orders/${orderDetails.uuid}`
    
    const msg = {
      to: sellerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Order Placed on Your Product",
      html: format(orderCreationMailHtmlContent, {
        customerFirstName: sellerUser.firstName, 
        referenceNumber: orderDetails.id, OffTakeMode: orderDetails.orderReceiveType,
        orderLink: orderLink,
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}


export const sendRequestACallMailToAdmin = async (requestUser: User): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const requestACallMailMailFilePath = `${__dirname}/../emailTemplates/requestacall.html`    
    const requestACallMailHtmlContent = fs.readFileSync(requestACallMailMailFilePath, 'utf8')
    
    const msg = {
      to: 'cb_support@cinderbuild.com',
      from: "admin@cinderbuild.com",
      subject: "Request A Call",
      html: format(requestACallMailHtmlContent, {
        customerFirstName: requestUser.firstName,
        customerLastName: requestUser.lastName, 
        customerPhoneNumber: requestUser.msisdn,
        customerEmail: requestUser.emailAddress
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendorderAvaialableForPickMail = async (buyerUser: User, orderDetails: Order, orderPickupDetails: PickupLocation): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const orderAvaialableForPickupMailFilePath = `${__dirname}/../emailTemplates/orderavailableforpickup.html`    
    const orderAvaialableForPickupMailHtmlContent = fs.readFileSync(orderAvaialableForPickupMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const orderTrackURL = `https://${domain}/buyer/orders/${orderDetails.uuid}`
    
    const msg = {
      to: buyerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Available For Pickup",
      html: format(orderAvaialableForPickupMailHtmlContent, {
        customerFirstName: buyerUser.firstName,
        referenceNumber: orderDetails.referenceNumber,
        address: orderPickupDetails.address,
        orderTrackURL
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendorderAvailableForDeliveryMail = async (buyerUser: User, orderDetails: Order, orderDeliveryDetails: DeliveryLocation): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const orderavailablefordeliverMailFilePath = `${__dirname}/../emailTemplates/orderavailablefordelivery.html`    
    const orderavailablefordeliverMailHtmlContent = fs.readFileSync(orderavailablefordeliverMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const orderTrackURL = `https://${domain}/buyer/orders/${orderDetails.uuid}`
    
    const msg = {
      to: buyerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Available For Delivery",
      html: format(orderavailablefordeliverMailHtmlContent, {
        customerFirstName: buyerUser.firstName,
        referenceNumber: orderDetails.referenceNumber,
        address: orderDeliveryDetails.address,
        orderTrackURL
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}


export const sendOrderConfirmPickupMail = async (buyerUser: User, orderDetails: Order ): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const orderconfirmpickupMailFilePath = `${__dirname}/../emailTemplates/orderconfirmpickup.html`    
    const orderconfirmpickupMailHtmlContent = fs.readFileSync(orderconfirmpickupMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const orderTrackURL = `https://${domain}/buyer/orders/${orderDetails.uuid}`
    
    const msg = {
      to: buyerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Order Picked Up Confirmation",
      html: format(orderconfirmpickupMailHtmlContent, {
        customerFirstName: buyerUser.firstName,
        referenceNumber: orderDetails.referenceNumber,
        orderTrackURL
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendOrderConfirmDeliveryMail = async (buyerUser: User, orderDetails: Order ): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const orderconfirmdeliveryMailFilePath = `${__dirname}/../emailTemplates/orderconfirmdelivery.html`    
    const orderconfirmdeliveryMailHtmlContent = fs.readFileSync(orderconfirmdeliveryMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const orderTrackURL = `https://${domain}/buyer/orders/${orderDetails.uuid}`
    
    const msg = {
      to: buyerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Order Delivery Confirmed",
      html: format(orderconfirmdeliveryMailHtmlContent, {
        customerFirstName: buyerUser.firstName,
        referenceNumber: orderDetails.referenceNumber,
        orderTrackURL
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendQouteRequestMailSeller = async (sellerUser: User, qouteRequestDetails: QuoteRequest ): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const qouteRequestMailFilePath = `${__dirname}/../emailTemplates/qouterequesttoseller.html`    
    const qouteRequestMailHtmlContent = fs.readFileSync(qouteRequestMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const qouteRequestDetailsURL = `https://${domain}/seller/quote-request/${qouteRequestDetails.uuid}`
    
    const msg = {
      to: sellerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Quote Request Raised",
      html: format(qouteRequestMailHtmlContent, {
        customerFirstName: sellerUser.firstName,
        referenceNumber: qouteRequestDetails.referenceNumber,
        productName: qouteRequestDetails.product.name,
        quantity: qouteRequestDetails.quantity,
        qouteRequestDetailsURL
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendQouteRequestResponseMailResponse = async (buyerUser: User, qouteRequestDetails: QuoteRequest ): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const qouteRequestResponseMailFilePath = `${__dirname}/../emailTemplates/quoterequestresponsebuyer.html`    
    const qouteRequestResponseMailHtmlContent = fs.readFileSync(qouteRequestResponseMailFilePath, 'utf8')
    const domain = Utils.serverDomain()

    const qouteRequestDetailsURL = `https://${domain}/buyer/quote-request/${qouteRequestDetails.uuid}`
    
    const msg = {
      to:  buyerUser.emailAddress,
      cc: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Quote Request Response",
      html: format(qouteRequestResponseMailHtmlContent, {
        customerFirstName: buyerUser.firstName,
        referenceNumber: qouteRequestDetails.referenceNumber,
        productName: qouteRequestDetails.product.name,
        quantity: qouteRequestDetails.quantity,
        buyerPrice: qouteRequestDetails.sellerResponse.unitPriceForBuyer, 
        totalCost: qouteRequestDetails.calculatedTotalCostMajor,
        qouteRequestDetailsURL

      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}

export const sendMailtoAdminOnPLPApplication = async (plpUser: User ): Promise<boolean> => {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
    const productleaseprogramMailFilePath = `${__dirname}/../emailTemplates/plpApplication.html`    
    const productleaseprogramMailHtmlContent = fs.readFileSync(productleaseprogramMailFilePath, 'utf8')

    const msg = {
      to: "cb_support@cinderbuild.com",
      from: "admin@cinderbuild.com",
      subject: "Application For Product Lease Program",
      html: format(productleaseprogramMailHtmlContent, {
        customerFirstName: plpUser.firstName,
        cuatomerLastName: plpUser.lastName,
        accountId: plpUser.id,
        phoneNumber: plpUser.msisdn,
        emailAddress: plpUser.emailAddress,
      }),
    }

    await sgMail.send(msg)
    return true
  } catch (e) {
    logger.error('Sendgrid error: ', e.message)
    return false
  }
}



export const sendNotificationToUserViaMailForQouteR = async (user: User, notificationType: NotificationMessageTypes,
  title: string, qouteRequestDetails?: QuoteRequest) => {
    // send mail to buyer about qoute request
    if(notificationType === NotificationMessageTypes.QOUTE_REQUEST_RAISED){
      const sendQouteRequestToSeller = await sendQouteRequestMailSeller(user, qouteRequestDetails)
      console.log(sendQouteRequestToSeller)
    }

    if(notificationType === NotificationMessageTypes.QUOTE_REQUEST_SELLER_RESPONSE){
      const qouteRequestResponseToBuyer = await sendQouteRequestResponseMailResponse(user, qouteRequestDetails)
      console.log(qouteRequestResponseToBuyer)
    }

  }



export const sendNotificationToUserViaMail = async (user: User, notificationType: NotificationMessageTypes,
    title: string, orderDetails?: Order) => {
  const connection = await getFreshConnection()
  if(notificationType === NotificationMessageTypes.ORDER_PAYMENT_IN_ESCROW){
    // buyer
    const sendorderPayment =  await sendOrderPaymentMailToBuyer(user, orderDetails, title)
    console.log(sendorderPayment)
  } 
  if(notificationType === NotificationMessageTypes.ORDER_CREATED){
    // seller 
    const oderCretion =  await sendOrderCreationMailToSeller(user, orderDetails, title)    
  }
  if(notificationType === NotificationMessageTypes.ENABLE_PLP){
    const enableForPLP = await sendCustomerEnabledForPlp(user)
    console.log(enableForPLP)
  }
  if(notificationType === NotificationMessageTypes.ORDER_AVAILABLE_FOR_PICKUP){
    // fetch pickup details
    const pickupLocationRepo = connection.getRepository(PickupLocation)
    const orderPickupDetails = await pickupLocationRepo.findOne({id: orderDetails.pickupLocationId})
   const sendorderPickupMail = await sendorderAvaialableForPickMail(user, orderDetails, orderPickupDetails)
   console.log(sendorderPickupMail)
  }
  if(notificationType === NotificationMessageTypes.ORDER_AVAILABLE_FOR_DELIVERY){
    const deliveryLocationRepo = connection.getRepository(DeliveryLocation)
    const orderDeliveryDetails = await deliveryLocationRepo.findOne({id: orderDetails.deliveryLocationId})
    const orderAvailableForDeliveryMail = await sendorderAvailableForDeliveryMail(user, orderDetails, orderDeliveryDetails)
    console.log(orderAvailableForDeliveryMail)
  }

  if(notificationType === NotificationMessageTypes.CONFIRMED_PICKUP){
    
    const orderConfirmPickupyMail = await sendOrderConfirmPickupMail(user, orderDetails)
    console.log(orderConfirmPickupyMail)
  }


  if(notificationType === NotificationMessageTypes.CONFIRMED_DELIVERY){
    
    const orderConfirmDeliveryMail = await sendOrderConfirmDeliveryMail(user, orderDetails)
    console.log(orderConfirmDeliveryMail)
  }





}