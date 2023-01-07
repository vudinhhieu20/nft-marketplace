const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ZeroAddress = "0x0000000000000000000000000000000000000000";

describe("NFTMarket_Creator_Transaction", function () {
  async function deployment() {
    /* deploy the marketplace */
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();

    const [owner, addr1, addr2] = await ethers.getSigners();

    return { nftMarketplace, owner, addr1, addr2 };
  }

  /**
   * Test function: FetchMyNFTs, FetchItemListed, FetchItemCreated
   * Luồng xem sản phẩm mình đã mua, đang đăng bán, đấu giá, sản phẩm đã tạo
   */
  it("Should show item purchased, listed, auctioned and created", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    /* create market and auction item */
    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation.com", testPrice, false, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation2.com", testPrice, false, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation3.com", testPrice, true, 0, {
        value: listingPrice,
      });

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation4.com", testPrice, true, 0, {
        value: listingPrice,
      });

    /* purchased item */
    await expect(
      nftMarketplace.connect(addr2).createMarketSale(1, { value: testPrice })
    ).to.changeEtherBalances([addr1, addr2], [testPrice, -testPrice]);

    await expect(await nftMarketplace.ownerOf(1)).to.equal(addr2.address);

    /* query for purchased items */
    let purchasedItems = await nftMarketplace.connect(addr2).fetchMyNFTs();
    await expect(purchasedItems.length).to.equal(1);

    purchasedItems = await Promise.all(
      purchasedItems.map(async (i) => {
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
    console.log("Purchased items belong to addr2: ", purchasedItems);

    /* query for listed items */
    let listedItems = await nftMarketplace.connect(addr1).fetchItemsListed();
    await expect(listedItems.length).to.equal(1);

    listedItems = await Promise.all(
      listedItems.map(async (i) => {
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
    console.log("Listed items belong to addr1: ", listedItems);

    /* query for auctioned items */
    let auctionedItems = await nftMarketplace
      .connect(addr1)
      .fetchAuctionedItems();
    await expect(auctionedItems.length).to.equal(2);

    auctionedItems = await Promise.all(
      auctionedItems.map(async (i) => {
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
    console.log("Auctioned items belong to addr1: ", auctionedItems);

    /* query for created items */
    let createdItems = await nftMarketplace.connect(addr1).fetchCreatedItems();
    await expect(createdItems.length).to.equal(4);

    createdItems = await Promise.all(
      createdItems.map(async (i) => {
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
    console.log("Created items belong to addr1: ", createdItems);
    console.log("Owner of marketplace: ", owner.address);
    console.log("Address 1: ", addr1.address);
    console.log("Address 2: ", addr2.address);
    console.log("Contract address: ", nftMarketplace.address);
  });
});
