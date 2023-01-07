const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ZeroAddress = "0x0000000000000000000000000000000000000000";

describe("NFTMarket_Market_Transaction", function () {
  async function deployment() {
    /* deploy the marketplace */
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    await nftMarketplace.deployed();

    const [owner, addr1, addr2] = await ethers.getSigners();

    return { nftMarketplace, owner, addr1, addr2 };
  }

  /**
   * Test function: CreateToken, CreateMarketItem
   * Luồng tạo mới sản phẩm NFT
   */
  it("Should create, emit when created, alert when value not equal listing price or price not at least 1", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    /* create two tokens */
    await expect(
      await nftMarketplace
        .connect(addr1)
        .createToken("https://www.mytokenlocation.com", testPrice, false, 0, {
          value: listingPrice,
        })
    )
      .to.emit(nftMarketplace, "MarketItemCreated")
      .withArgs(
        1,
        addr1.address,
        addr1.address,
        nftMarketplace.address,
        testPrice,
        false,
        false,
        0,
        false,
        testPrice,
        ZeroAddress
      );

    await expect(
      nftMarketplace
        .connect(addr1)
        .createToken("https://www.mytokenlocation2.com", 0, false, 0, {
          value: testPrice,
        })
    ).to.be.revertedWith("Price must be at least 1 wei");

    await expect(
      nftMarketplace
        .connect(addr1)
        .createToken("https://www.mytokenlocation2.com", testPrice, false, 0, {
          value: testPrice,
        })
    ).to.be.revertedWith("Value must be equal to listing price");
  });

  /**
   * Test function: ResellToken, MakeMarketSale
   * Luồng mua sản phẩm và bán lại sản phẩm
   */
  it("Should execute market sales and resell", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

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

    /* execute sale of token to another user */
    await expect(
      nftMarketplace.connect(addr2).createMarketSale(1, { value: testPrice })
    ).to.changeEtherBalances([addr1, addr2], [testPrice, -testPrice]);

    await expect(await nftMarketplace.ownerOf(1)).to.equal(addr2.address);

    /* resell a token */
    await nftMarketplace
      .connect(addr2)
      .resellToken(1, testPrice, { value: listingPrice });

    await expect(await nftMarketplace.ownerOf(1)).to.equal(
      nftMarketplace.address
    );
  });

  /**
   * Test function: UnlistMarketItem
   * Luồng gỡ bán sản phẩm
   */
  it("Should unlist market item and revert while not seller or not enough value", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

    await nftMarketplace
      .connect(addr1)
      .createToken("https://www.mytokenlocation.com", testPrice, false, 0, {
        value: listingPrice,
      });

    let beforeOwner = await nftMarketplace.ownerOf(1);
    console.log("Before owner: " + beforeOwner);

    await expect(
      nftMarketplace.connect(addr2).unlistMarketItem(1, { value: listingPrice })
    ).to.be.revertedWith("You are not seller");

    await expect(
      nftMarketplace.connect(addr1).unlistMarketItem(1, { value: testPrice })
    ).to.be.revertedWith("Please submit value equal to listing price");

    await expect(
      await nftMarketplace
        .connect(addr1)
        .unlistMarketItem(1, { value: listingPrice })
    ).to.changeEtherBalances([owner, addr1], [listingPrice, -listingPrice]);

    let afterOwner = await nftMarketplace.ownerOf(1);
    console.log("After owner: " + afterOwner);
  });

  /**
   * Test function: FetchMarketItems
   * Luồng liệt kê danh sách sản phẩm bán
   */
  it("Should list market items", async function () {
    const { nftMarketplace, owner, addr1, addr2 } = await loadFixture(
      deployment
    );

    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    const testPrice = ethers.utils.parseUnits("1000", "wei");

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

    /* query for and return the unsold items */
    items = await nftMarketplace.fetchMarketItems();

    await expect(items.length).to.equal(2);

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
