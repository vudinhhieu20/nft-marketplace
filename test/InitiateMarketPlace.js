const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarket_Initiate", function () {
  async function deployment() {
    /* deploy the marketplace */
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();

    const [owner, addr1, addr2] = await ethers.getSigners();

    return { nftMarketplace, owner, addr1, addr2 };
  }

  it("Should update listing price and revert when not owner", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    console.log("Listing price original: " + listingPrice);

    // Update listing price
    await nftMarketplace.updateListingPrice(testPrice);

    listingPrice = await nftMarketplace.getListingPrice();
    await expect(listingPrice).to.equal(1000);
    console.log("Listing price updated: " + listingPrice);

    // Update when not owner
    await expect(
      nftMarketplace.connect(addr1).updateListingPrice(testPrice)
    ).to.be.revertedWith("Only marketplace owner can update listing price.");
  });

  it("Should create list auction", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    /* create two tokens */
    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation.com", testPrice, true, 0, {
        value: listingPrice,
      });
    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation2.com", testPrice, true, 0, {
        value: listingPrice,
      });

    /* query for and return the unsold auction items */
    items = await nftMarketplace.fetchAuctionItems();
    items = await Promise.all(
      items.map(async (i) => {
        const tokenUri = await nftMarketplace.tokenURI(i.tokenId);
        let item = {
          price: i.price.toString(),
          tokenId: i.tokenId.toString(),
          creator: i.creator,
          seller: i.seller,
          owner: i.owner,
          tokenUri,
          auction: i.auction,
        };
        return item;
      })
    );
    console.log("items: ", items);
    console.log("Owner of marketplace: ", owner.address);
    console.log("Address 1: ", addr1.address);
    console.log("Address 2: ", addr2.address);
    console.log("Contract address: ", nftMarketplace.address);
  });
});
